/**
 * NSC Preloader System
 * Handles preloader display and automatic removal
 */

class PreloaderManager {
    constructor() {
        this.preloader = null;
        this.isLoaded = false;
        this.fadeOutDuration = 600; // ms
        this.init();
    }

    init() {
        // Create and inject preloader
        this.injectPreloader();
        
        // Set up load event listeners
        this.setupLoadListeners();
        
        // Fallback: hide preloader after max wait time
        this.setupFallback();
    }

    injectPreloader() {
        // Create container for preloader
        const preloaderContainer = document.createElement('div');
        preloaderContainer.id = 'preloader-container';
        preloaderContainer.innerHTML = `
            <div id="preloader" class="fixed inset-0 bg-white flex flex-col items-center justify-center fade-in" style="z-index: 9999;">
                <div class="pulse-gentle text-center">
                    <h1 class="text-6xl md:text-8xl font-bold text-[#CC1000] mb-4 tracking-wider">NSC</h1>
                    <p class="text-[#CC1000] text-lg md:text-xl font-light opacity-90">Naija Style Co...</p>
                </div>
            </div>
        `;
        
        // Add styles
        this.addPreloaderStyles();
        
        // Insert at the beginning of body
        document.body.insertAdjacentElement('afterbegin', preloaderContainer);
        this.preloader = document.getElementById('preloader');
    }

    addPreloaderStyles() {
        const styles = `
            <style>
                @keyframes pulse-gentle {
                    0%, 100% { 
                        opacity: 1; 
                        transform: scale(1); 
                    }
                    50% { 
                        opacity: 0.8; 
                        transform: scale(1.05); 
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                .pulse-gentle {
                    animation: pulse-gentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                
                .fade-in {
                    animation: fadeIn 0.6s ease-out forwards;
                }
                
                .fade-out {
                    animation: fadeOut 0.6s ease-in forwards;
                }
                
                #preloader {
                    z-index: 9999;
                    pointer-events: all;
                }
                
                #preloader.hidden {
                    pointer-events: none;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupLoadListeners() {
        // Wait for everything to load
        window.addEventListener('load', () => {
            // Small delay to ensure everything is ready
            setTimeout(() => {
                this.hidePreloader();
            }, 500);
        });

        // Additional check for images
        this.waitForImages();
    }

    waitForImages() {
        const images = document.images;
        let loadedCount = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
            return;
        }

        const imageLoaded = () => {
            loadedCount++;
            // If all images loaded and page is ready, hide preloader
            if (loadedCount === totalImages && document.readyState === 'complete') {
                this.hidePreloader();
            }
        };

        // Check each image
        Array.from(images).forEach(img => {
            if (img.complete) {
                imageLoaded();
            } else {
                img.addEventListener('load', imageLoaded);
                img.addEventListener('error', imageLoaded); // Count errors as loaded
            }
        });
    }

    setupFallback() {
        // Maximum wait time of 4 seconds
        setTimeout(() => {
            if (!this.isLoaded) {
                this.hidePreloader();
            }
        }, 4000);
    }

    hidePreloader() {
        if (this.isLoaded || !this.preloader) return;
        
        this.isLoaded = true;
        
        // Add fade-out class
        this.preloader.classList.add('fade-out');
        
        // Wait for fade-out animation to complete
        setTimeout(() => {
            if (this.preloader) {
                // Disable pointer events
                this.preloader.classList.add('hidden');
                
                // Remove from DOM after animation
                setTimeout(() => {
                    if (this.preloader && this.preloader.parentNode) {
                        this.preloader.parentNode.remove();
                    }
                }, 100);
            }
        }, this.fadeOutDuration);
    }
}

// Initialize preloader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PreloaderManager();
});

// Prevent FOUC (Flash of Unstyled Content)
document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
        // Ensure preloader is visible immediately
        const preloaderContainer = document.getElementById('preloader-container');
        if (preloaderContainer) {
            preloaderContainer.style.display = 'block';
        }
    }
});


// // Disable right-click
// document.addEventListener("contextmenu", e => e.preventDefault());

// // Disable text selection
// document.addEventListener("selectstart", e => e.preventDefault());
// document.addEventListener("dragstart", e => e.preventDefault());

// // Disable keyboard shortcuts
// document.addEventListener("keydown", function (e) {

//     // Block F12
//     if (e.key === "F12") {
//         e.preventDefault();
//     }

//     // Block Ctrl + Shift + I/J/C
//     if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
//         e.preventDefault();
//     }

//     // Block Ctrl + U/S/P/A/C/X/V
//     if (e.ctrlKey && ["U","S","P","A","C","X","V"].includes(e.key.toUpperCase())) {
//         e.preventDefault();
//     }

//     // Block Ctrl alone (optional)
//     if (e.key === "Control") {
//         e.preventDefault();
//     }
// });
