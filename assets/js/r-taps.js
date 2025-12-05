  const API_URL = "http://localhost:5000";

    const elements = {
        // Global elements
        globalLoader: document.getElementById('global-loader'),
        
        // Header elements
        userSection: document.getElementById('user-section'),
        mobileUserSection: document.getElementById('mobile-user-section'),
        cartBadge: document.getElementById('cart-badge'),
        desktopNav: document.getElementById('desktop-nav'),
        mobileNavContent: document.getElementById('mobile-nav-content'),
        navSkeleton: document.getElementById('nav-skeleton'),
        mobileNavSkeleton: document.getElementById('mobile-nav-skeleton'),
        
        // Mobile menu
        mobileMenu: document.getElementById('mobile-menu'),
        mobileBtn: document.getElementById('mobile-menu-btn'),
        mobileClose: document.getElementById('mobile-close'),
        
        // Hero section
        heroContent: document.getElementById('hero-content'),
        heroTitleSkeleton: document.getElementById('hero-title-skeleton'),
        
        // Categories section
        categoriesContent: document.getElementById('categories-content'),
        categoriesHeader: document.getElementById('categories-header'),
        categoriesSkeleton: document.getElementById('categories-skeleton'),
        categoriesHeaderSkeleton: document.getElementById('categories-header-skeleton'),
        
        // Featured products
        featuredCarousel: document.getElementById('featured-carousel'),
        featuredHeader: document.getElementById('featured-header'),
        carouselSkeleton: document.getElementById('carousel-skeleton'),
        featuredHeaderSkeleton: document.getElementById('featured-header-skeleton'),
        carouselPrev: document.getElementById('carousel-prev'),
        carouselNext: document.getElementById('carousel-next'),
        carouselIndicators: document.getElementById('carousel-indicators'),
        carouselLoader: document.getElementById('carousel-loader'),
        
        // Newsletter
        newsletterContent: document.getElementById('newsletter-content'),
        newsletterSkeleton: document.getElementById('newsletter-skeleton')
    };

    let currentUser = null;
    let sse = null;
    let featuredProducts = [];
    let currentSlide = 0;

    // Universal fetch wrapper that handles auth
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('access_token');
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${token}`;
        options.headers['Content-Type'] = 'application/json';

        try {
            const res = await fetch(url, options);

            if (res.status === 401) {
                // Token expired or invalid
                console.warn('⚠️ Received 401 from server, logging out...');
                logoutUser();
                showToast('Session expired. Please log in again.', 'error');
                throw new Error('Unauthorized');
            }

            return res;
        } catch (err) {
            console.error('❌ fetchWithAuth error:', err);
            throw err;
        }
    }

    // Logout function
    function logoutUser() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        window.location.href = '/auth/login';
    }

    // Debug function to check localStorage
    function debugStorage() {
        console.log('🔍 localStorage debug:');
        console.log('access_token:', localStorage.getItem('access_token'));
        console.log('refresh_token:', localStorage.getItem('refresh_token'));
        console.log('user:', localStorage.getItem('user'));
        console.log('-------------------');
    }

    // Hide skeleton and show content
    function showContent(skeletonId, contentId) {
        const skeleton = document.getElementById(skeletonId);
        const content = document.getElementById(contentId);
        
        if (skeleton) skeleton.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }

    // Main init
    async function init() {
        console.log('🔄 init() called');
        debugStorage();
        
        // Initial content loading (non-blocking)
        loadInitialContent();
        
        const token = localStorage.getItem('access_token');
        console.log('📝 Token found:', !!token);
        
        if (token) {
            try {
                console.log('🔐 Attempting to fetch user...');
                currentUser = await fetchUser();
                console.log('✅ User fetched successfully:', currentUser);
                renderLoggedIn();
                startSSE();
                await fetchCartCount();
            } catch (err) {
                console.error('❌ Error fetching user:', err);
                if (err.message === 'Unauthorized') {
                    console.log('🔑 Unauthorized - showing guest state');
                    renderGuest();
                }
            }
        } else {
            console.log('👤 No token, rendering guest state');
            renderGuest();
        }

        // Load featured products
        await loadFeaturedProducts();
        setupCarousel();
        
        // Hide global loader after everything is loaded
        setTimeout(() => {
            elements.globalLoader.style.opacity = '0';
            setTimeout(() => {
                elements.globalLoader.style.display = 'none';
            }, 300);
        }, 500);
    }

    // Load initial static content
    function loadInitialContent() {
        // Show navigation
        showContent('nav-skeleton', 'desktop-nav');
        showContent('mobile-nav-skeleton', 'mobile-nav-content');
        
        // Show hero content after image loads
        setTimeout(() => {
            showContent('hero-title-skeleton', 'hero-content');
        }, 800);
        
        // Show categories
        setTimeout(() => {
            showContent('categories-header-skeleton', 'categories-header');
            showContent('categories-skeleton', 'categories-content');
        }, 1000);
        
        // Show newsletter
        setTimeout(() => {
            showContent('newsletter-skeleton', 'newsletter-content');
        }, 1200);
    }

    async function fetchUser() {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            console.log('❌ No token in fetchUser()');
            renderGuest();
            throw new Error('No token');
        }

        // First, check if we have user data in localStorage
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
            console.log('📦 Using cached user data');
            return JSON.parse(cachedUser);
        }

        console.log('🌐 Making request to /api/auth/me');
        const res = await fetchWithAuth(`${API_URL}/api/auth/me`);

        if (!res.ok) {
            throw new Error('Failed to fetch user');
        }

        const user = await res.json();
        console.log('✅ User data received:', user);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    }

    async function fetchCartCount() {
        if (!currentUser) return;

        try {
            console.log('🛒 Fetching cart count for user:', currentUser._id || currentUser.id);

            const res = await fetchWithAuth(`${API_URL}/cart/${currentUser._id || currentUser.id}`);

            console.log('📡 Cart response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Cart data:', data);
                elements.cartBadge.textContent = data.total_items > 99 ? '99+' : data.total_items;
            } else if (res.status === 401) {
                // Token expired or invalid → log out user
                console.warn('⚠️ Token expired or invalid, logging out...');
                logoutUser();
                showToast('Session expired. Please log in again.', 'error');
            } else {
                const errorData = await res.json();
                console.error('❌ Cart fetch error:', errorData);
            }
        } catch (e) {
            console.error('Error fetching cart count:', e);
            showToast('Network error - please try again', 'error');
        }
    }

    // Load featured products from backend
    async function loadFeaturedProducts() {
        try {
            console.log('🛍️ Loading featured products...');
            
            // Show carousel skeleton initially
            elements.carouselLoader.classList.remove('hidden');
            
            const res = await fetch(`${API_URL}/featured-products`);
            console.log('📡 Products response status:', res.status);
            
            if (res.ok) {
                featuredProducts = await res.json();
                console.log('✅ Featured products loaded:', featuredProducts);
                
                // Hide skeleton and show content
                elements.carouselSkeleton.classList.add('hidden');
                elements.featuredCarousel.classList.remove('hidden');
                showContent('featured-header-skeleton', 'featured-header');
                elements.carouselLoader.classList.add('hidden');
                
                renderFeaturedProducts();
            } else {
                console.log('❌ Failed to load products');
                elements.carouselLoader.classList.add('hidden');
                showToast('Failed to load products', 'error');
            }
        } catch (error) {
            console.error('Error loading featured products:', error);
            elements.carouselLoader.classList.add('hidden');
            showToast('Network error loading products', 'error');
        }
    }

 // In the renderFeaturedProducts function, update the product card HTML:
function renderFeaturedProducts() {
    elements.featuredCarousel.innerHTML = '';
    elements.carouselIndicators.innerHTML = '';

    featuredProducts.forEach((product, index) => {
        // Product card with improved styling
        const productCard = `
            <div class="carousel-item snap-start flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 px-2 transition-transform duration-300 hover:scale-105">
                <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden transition-shadow duration-300">
                    <div class="aspect-[3/4] bg-gray-200 relative cursor-pointer" onclick="viewProductDetails('${product._id}')">
                        <img src="${product.images?.[0] || 'https://picsum.photos/300/400?random=${index}'}" 
                             alt="${product.name}" 
                             class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                             onerror="this.src='https://picsum.photos/300/400?random=${index}'">
                        <div class="absolute top-4 right-4 bg-gold text-white px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                            ${product.category}
                        </div>
                        <div class="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                            <span class="text-white text-lg font-semibold bg-gold/90 px-4 py-2 rounded-full">Quick View</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <h3 class="text-xl font-semibold text-deep-black mb-2 truncate cursor-pointer hover:text-gold transition" onclick="viewProductDetails('${product._id}')">${product.name}</h3>
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-2xl font-bold text-gold">₦${product.price.toFixed(2)}</p>
                            ${product.stock_quantity ? 
                                `<span class="text-sm px-2 py-1 rounded-full ${product.stock_quantity > 10 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                                    ${product.stock_quantity > 10 ? 'In Stock' : `Only ${product.stock_quantity} left`}
                                </span>` : 
                                ''
                            }
                        </div>
                        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description || 'Premium African fashion item'}</p>
                        <div class="flex gap-3">
                            <button onclick="addToCart('${product._id}')" class="flex-1 bg-deep-black text-white py-3 rounded-lg font-medium hover:bg-gold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">
                                Add to Cart
                            </button>
                            <button onclick="viewProductDetails('${product._id}')" class="flex-1 bg-transparent border border-gold text-gold py-3 rounded-lg font-medium hover:bg-gold hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        elements.featuredCarousel.innerHTML += productCard;

        // Carousel indicator
        const indicator = document.createElement('button');
        indicator.className = ` ${index === 0 ? 'bg-gold scale-125' : 'bg-gray-300 hover:bg-gray-400'}`;
        indicator.addEventListener('click', () => goToSlide(index));
        elements.carouselIndicators.appendChild(indicator);
    });
}

// Add this new function to handle product details:
window.viewProductDetails = async function(productId) {
    try {
        console.log('🔍 Viewing product details for:', productId);
        
        // Show loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'product-details-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-gold"></div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Fetch product details
        const res = await fetch(`${API_URL}/featured-products/${productId}`);
        console.log('📡 Product details response:', res.status);
        
        if (res.ok) {
            const product = await res.json();
            console.log('✅ Product details:', product);
            
            // Remove loading overlay
            overlay.remove();
            
            // Create and show product modal
            showProductModal(product);
        } else {
            console.error('❌ Failed to fetch product details');
            overlay.remove();
            showToast('Failed to load product details', 'error');
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
        document.getElementById('product-details-overlay')?.remove();
        showToast('Network error loading product', 'error');
    }
}
// Function to show product modal
function showProductModal(product) {
    // Get stock information
    const stock = product.stock || product.stock_quantity || 0;
    const stockDisplay = stock > 10 ? 'In Stock' : `${stock} remaining`;
    const stockClass = stock > 10 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
    const stockIcon = stock > 10 ? 'fa-check-circle' : stock > 0 ? 'fa-exclamation-triangle' : 'fa-times-circle';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'product-modal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <!-- Modal header -->
            <div class="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 class="text-2xl font-bold text-deep-black">${product.name}</h2>
                <button onclick="closeProductModal()" class="text-2xl text-gray-400 hover:text-gold transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Modal content -->
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Product images -->
                    <div>
                        <div class="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                            <img src="${product.images?.[0] || '/assets/images/placeholder.jpg'}" 
                                 alt="${product.name}" 
                                 class="w-full h-full object-cover" 
                                 id="main-product-image">
                        </div>
                        ${product.images && product.images.length > 1 ? `
                            <div class="flex gap-4 overflow-x-auto py-2">
                                ${product.images.map((img, idx) => `
                                    <img src="${img}" 
                                         alt="${product.name} - ${idx + 1}" 
                                         class="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition border-2 ${idx === 0 ? 'border-gold' : 'border-transparent'}"
                                         onclick="changeProductImage(this, '${img}')">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Product details -->
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <p class="text-3xl font-bold text-gold">₦${product.price.toFixed(2)}</p>
                                ${stock > 0 ? 
                                    `<span class="px-3 py-1 rounded-full text-sm font-medium ${stockClass}">
                                        <i class="fas ${stockIcon} mr-1"></i>${stockDisplay}
                                    </span>` : 
                                    `<span class="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                        <i class="fas fa-times-circle mr-1"></i>Out of Stock
                                    </span>`
                                }
                            </div>
                            
                            <div class="flex items-center gap-4 mb-4">
                                <span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                    ${product.category || 'Uncategorized'}
                                </span>
                                ${product.material ? `
                                    <span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                        ${product.material}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="text-lg font-semibold text-deep-black mb-2">Description</h3>
                            <p class="text-gray-600 leading-relaxed">${product.description || 'No description available.'}</p>
                        </div>
                        
                        ${product.features ? `
                            <div>
                                <h3 class="text-lg font-semibold text-deep-black mb-2">Features</h3>
                                <ul class="list-disc list-inside text-gray-600 space-y-1">
                                    ${product.features.split(',').map(feature => `<li>${feature.trim()}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <!-- Product details section -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-gray-600">Stock Available</p>
                                    <p class="font-semibold">${stock} units</p>
                                </div>
                                ${product.sku ? `
                                    <div>
                                        <p class="text-sm text-gray-600">SKU</p>
                                        <p class="font-semibold">${product.sku}</p>
                                    </div>
                                ` : ''}
                                ${product.size ? `
                                    <div>
                                        <p class="text-sm text-gray-600">Size</p>
                                        <p class="font-semibold">${product.size}</p>
                                    </div>
                                ` : ''}
                                ${product.color ? `
                                    <div>
                                        <p class="text-sm text-gray-600">Color</p>
                                        <p class="font-semibold">${product.color}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="pt-4 border-t border-gray-100">
                            <div class="flex gap-4">
                                <button onclick="addToCart('${product._id}', true)" 
                                        class="flex-1 bg-deep-black text-white py-4 rounded-xl font-medium hover:bg-gold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 flex items-center justify-center gap-2 ${stock <= 0 ? 'opacity-50 cursor-not-allowed hover:bg-deep-black' : ''}" 
                                        ${stock <= 0 ? 'disabled' : ''}>
                                    <i class="fas fa-shopping-bag"></i>
                                    ${stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                             
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}
// Function to change product image in modal
window.changeProductImage = function(element, imageUrl) {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
        mainImage.src = imageUrl;
    }
    
    // Update active thumbnail border
    document.querySelectorAll('#product-modal img[onclick^="changeProductImage"]').forEach(img => {
        img.classList.remove('border-gold');
        img.classList.add('border-transparent');
    });
    element.classList.remove('border-transparent');
    element.classList.add('border-gold');
}

// Function to close product modal
window.closeProductModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}
window.addToCart = async function(productId, closeModal = false) {
    console.log('🛒 Add to cart clicked for product:', productId);
    
    if (!currentUser) {
        console.log('👤 Not logged in, redirecting to login');
        window.location.href = '/auth/login';
        return;
    }

    try {
        // First, check product stock
        console.log('📦 Checking product stock...');
        const productRes = await fetch(`${API_URL}/featured-products/${productId}`);
        
        if (!productRes.ok) {
            showToast('Failed to check product availability', 'error');
            return;
        }
        
        const product = await productRes.json();
        const stock = product.stock || product.stock_quantity || 0;
        
        if (stock <= 0) {
            showToast('Sorry, this product is out of stock', 'error');
            return;
        }
        
        console.log('🌐 Sending POST to /cart/<user_id>/add');
        const res = await fetchWithAuth(`${API_URL}/cart/${currentUser._id || currentUser.id}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        console.log('📡 Response status:', res.status);
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Product added:', data);
            await fetchCartCount();
            showToast('Product added to cart!', 'success');
            
            // Close modal if requested
            if (closeModal) {
                closeProductModal();
            }
            
            // Update the stock display if on product card
            updateStockDisplay(productId, stock - 1);
        } else {
            const errorData = await res.json();
            console.error('❌ Add to cart error:', errorData);
            showToast(errorData.error || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Network error - please try again', 'error');
    }
};

// Helper function to update stock display
function updateStockDisplay(productId, newStock) {
    // Find the product card and update stock display
    const productCards = document.querySelectorAll('.carousel-item');
    productCards.forEach(card => {
        const addToCartBtn = card.querySelector('button[onclick*="addToCart"]');
        if (addToCartBtn && addToCartBtn.getAttribute('onclick').includes(productId)) {
            const stockSpan = card.querySelector('span[class*="bg-"]');
            if (stockSpan) {
                const stockDisplay = newStock > 10 ? 'In Stock' : `${newStock} remaining`;
                const stockClass = newStock > 10 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
                
                stockSpan.textContent = stockDisplay;
                stockSpan.className = `text-sm px-2 py-1 rounded-full ${stockClass}`;
                
                // Update add to cart button
                if (newStock <= 0) {
                    addToCartBtn.disabled = true;
                    addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    addToCartBtn.textContent = 'Out of Stock';
                }
            }
        }
    });
}                                                                                                                                               
// Add ESC key listener to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeProductModal();
    }
});

// Add click outside to close modal
document.addEventListener('click', function(e) {
    const modal = document.getElementById('product-modal');
    if (modal && e.target === modal) {
        closeProductModal();
    }
});
    // Toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl text-white transform transition-all duration-300 ${
            type === 'success' ? 'bg-red-600' : 'bg-red-600'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 500);
    }

    function renderLoggedIn() {
        console.log('🎨 Rendering logged in state for:', currentUser);
        const initials = ((currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '')).toUpperCase() || 'NS';
        const name = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'User';

        elements.userSection.innerHTML = `
            <div class="relative group">
                <div class="w-12 h-12 bg-gradient-to-br from-gold to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl cursor-pointer">
                    ${initials}
                </div>
                <div class="absolute right-0 top-16 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div class="p-6 bg-gradient-to-r from-gold/5 to-red-50/50 border-b border-gray-100">
                        <p class="font-semibold text-deep-black text-lg">${name}</p>
                        <p class="text-sm text-gray-600">${currentUser.email}</p>
                    </div>
                    ${currentUser.role === 'admin' ? '<a href="/admin" class="block px-6 py-4 hover:bg-gold/10 transition">Admin Dashboard</a>' : ''}
                    <button onclick="logout()" class="w-full text-left px-6 py-4 hover:bg-red-50 hover:text-red-600 transition flex items-center space-x-3">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        `;

        elements.mobileUserSection.innerHTML = `
            <button onclick="logout()" class="text-3xl text-red-400 hover:text-red-300 transition flex items-center justify-center space-x-4 mx-auto">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout (${currentUser.first_name || 'User'})</span>
            </button>
        `;
    }

    function renderGuest() {
        console.log('🎨 Rendering guest state');
        elements.userSection.innerHTML = `
            <a href="/auth/login" class="flex items-center space-x-3 hover:text-gold transition">
                <i class="fas fa-user text-2xl text-deep-black"></i>
                <span class="hidden md:block font-medium">Account</span>
            </a>
        `;
        elements.mobileUserSection.innerHTML = `<a href="/auth/login" class="text-3xl text-white/80 hover:text-gold transition">Login</a>`;
    }

    window.logout = function() {
        console.log('🚪 Logging out...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (sse) sse.close();
        location.reload();
    }

    function startSSE() {
        if (sse) sse.close();
        sse = new EventSource(`${API_URL}/events/stream`);

        sse.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                console.log('📡 SSE Message:', msg);
                
                if (msg.event === 'cart_updated' && msg.data.user_id === currentUser._id) {
                    fetchCartCount();
                }
                if (msg.event === 'product_updated') {
                    // Reload featured products when products are updated
                    loadFeaturedProducts();
                }
            } catch (err) {
                console.error('SSE error:', err);
            }
        };

        sse.onerror = () => {
            console.log('SSE connection error, reconnecting...');
            sse.close();
            setTimeout(startSSE, 3000);
        };
    }

    // Mobile menu
    elements.mobileBtn.onclick = () => {
        elements.mobileMenu.classList.remove('hidden');
        setTimeout(() => elements.mobileMenu.classList.add('open'), 10);
    };
    elements.mobileClose.onclick = () => {
        elements.mobileMenu.classList.remove('open');
        setTimeout(() => elements.mobileMenu.classList.add('hidden'), 650);
    };

    // Real-time sync across tabs
    window.addEventListener('storage', (e) => {
        console.log('📦 Storage event:', e.key, 'changed');
        if (['access_token', 'user'].includes(e.key)) {
            console.log('🔄 Re-initializing due to storage change');
            init();
        }
    });

    window.viewDetails = function(productId) {
        window.location.href = `/products/details.html?id=${productId}`;
    };

    // Start everything
    console.log('🚀 Starting application...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM loaded');
        init();
    });