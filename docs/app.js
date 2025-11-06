var app = new Vue({
  el: '#app',
  data: {
    // Mobile UI state
    sidebarOpen: false,

    // Library selection
    selectedLibrary: 'html5',
    libraryStatus: 'Loading libraries...',
    libraryLoaded: false,

    // Scanner state
    scanner: null,
    activeCameraId: null,
    cameras: [],
    scans: [],
    scanStatus: 'Select library and start scanning...',
    lastScanAttempt: null,

    // jsQR specific elements
    videoElement: null,
    canvasElement: null,
    canvasContext: null,
    scanningActive: false,
    animationFrame: null,

    // Error tracking
    errorCount: 0,

    // Camera switching
    availableCameras: [],
    frontCameraId: null,
    backCameraId: null,
    currentFacingMode: 'environment'
  },
  mounted: function () {
    var self = this;

    // Check which libraries are available
    self.checkLibraries();

    // Mobile-specific enhancements
    self.initMobileFeatures();
  },
  methods: {
    // Mobile UI methods
    toggleSidebar: function() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    closeSidebar: function() {
      this.sidebarOpen = false;
    },

    // Mobile enhancements
    initMobileFeatures: function() {
      var self = this;

      // Handle orientation changes
      window.addEventListener('orientationchange', function() {
        setTimeout(function() {
          self.closeSidebar();
        }, 500);
      });

      // Handle escape key to close sidebar on desktop too
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && self.sidebarOpen) {
          self.closeSidebar();
        }
      });

      // Close sidebar when scanning starts on mobile
      if (window.innerWidth <= 768) {
        self.$watch('libraryLoaded', function(loaded) {
          if (loaded) {
            setTimeout(function() {
              self.closeSidebar();
            }, 2000);
          }
        });
      }
    },

    // Library management
    checkLibraries: function() {
      var self = this;

      var html5Available = typeof Html5Qrcode !== 'undefined';
      var jsqrAvailable = typeof jsQR !== 'undefined';
      var zxingAvailable = (typeof ZXing !== 'undefined') && (typeof Scanner !== 'undefined') && (typeof Camera !== 'undefined');

      console.log('Library availability:', {
        html5: html5Available,
        jsqr: jsqrAvailable,
        zxing: zxingAvailable
      });

      if (html5Available && jsqrAvailable && zxingAvailable) {
        self.libraryStatus = 'All three libraries loaded successfully';
        self.libraryLoaded = true;
        self.scanStatus = 'Select library and start scanning...';
        // Initialize with default library
        setTimeout(function() {
          self.initializeScanner();
        }, 100);
      } else {
        var missingLibraries = [];
        if (!html5Available) missingLibraries.push('Html5Qrcode');
        if (!jsqrAvailable) missingLibraries.push('jsQR');
        if (!zxingAvailable) missingLibraries.push('ZXing');

        self.libraryStatus = 'Error: Some libraries failed to load (' + missingLibraries.join(', ') + ')';
        self.libraryLoaded = false;
        self.scanStatus = 'Error: QR scanner libraries not loaded';

        if (!html5Available) console.error('Html5Qrcode library not loaded');
        if (!jsqrAvailable) console.error('jsQR library not loaded');
        if (!zxingAvailable) console.error('ZXing library not loaded');
      }
    },

    switchLibrary: function() {
      var self = this;
      console.log('Switching to library:', self.selectedLibrary);

      // Stop current scanning
      self.stopScanning();

      // Reset scanner state
      self.scanner = null;
      self.activeCameraId = null;
      self.cameras = [];
      self.scanStatus = 'Initializing ' + self.getLibraryName() + '...';

      // Reinitialize with new library
      setTimeout(function() {
        self.initializeScanner();
      }, 100);
    },

    getLibraryName: function() {
      if (this.selectedLibrary === 'html5') return 'HTML5-QRCode';
      if (this.selectedLibrary === 'jsqr') return 'jsQR';
      if (this.selectedLibrary === 'zxing') return 'ZXing';
      return 'Unknown';
    },

    // Scanner initialization
    initializeScanner: function() {
      var self = this;

      if (self.selectedLibrary === 'html5') {
        self.initializeHtml5Scanner();
      } else if (self.selectedLibrary === 'jsqr') {
        self.initializeJsQRScanner();
      } else if (self.selectedLibrary === 'zxing') {
        self.initializeZxingScanner();
      }
    },

    // HTML5-QRCode initialization
    initializeHtml5Scanner: function() {
      var self = this;

      console.log('Initializing Html5Qrcode scanner...');
      self.scanner = new Html5Qrcode("preview");
      self.scanStatus = 'Getting cameras...';

      Html5Qrcode.getCameras().then(function (devices) {
        console.log('Cameras found:', devices);

        if (devices && devices.length) {
          self.cameras = devices.map(device => ({
            id: device.id || 'default',
            name: device.label || `Camera ${device.id || 'default'}`
          }));

          console.log('Processed cameras:', self.cameras);

          // Identify front and back cameras
          self.identifyCameras();

          if (self.cameras.length > 0) {
            // Start with back camera by default if available
            var startCameraId = self.backCameraId || self.cameras[0].id;
            self.activeCameraId = startCameraId;
            self.scanStatus = 'Starting camera...';
            self.startCamera(startCameraId);
          } else {
            self.scanStatus = 'No cameras available';
          }
        } else {
          self.scanStatus = 'No cameras found';
        }
      }).catch(function (e) {
        console.error('Camera enumeration failed:', e);
        self.scanStatus = 'Camera access denied or not available';
      });
    },

    // jsQR initialization
    initializeJsQRScanner: function() {
      var self = this;

      self.videoElement = document.getElementById('preview-video');
      self.canvasElement = document.getElementById('canvas');
      self.canvasContext = self.canvasElement.getContext('2d');

      console.log('Initializing jsQR scanner...');
      console.log('User Agent:', navigator.userAgent);
      console.log('Current URL:', window.location.href);
      console.log('Protocol:', window.location.protocol);

      self.scanStatus = 'Checking browser compatibility...';

      // Check browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        self.scanStatus = 'Error: Browser does not support camera access. Try using Chrome, Firefox, or Edge.';
        return;
      }

      if (!window.isSecureContext) {
        console.error('Not a secure context');
        self.scanStatus = 'Error: Camera access requires HTTPS. Please use the secure version at https://localhost:8443/docs/';
        return;
      }

      self.scanStatus = 'Getting cameras...';

      // Get available cameras
      navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
          console.log('All devices found:', devices);

          // Filter for video input devices
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Video devices found:', videoDevices);

          if (videoDevices && videoDevices.length) {
            self.cameras = videoDevices.map(device => ({
              id: device.deviceId || 'default',
              name: device.label || `Camera ${device.deviceId || 'default'}`
            }));

            console.log('Processed cameras:', self.cameras);

            // Identify front and back cameras
            self.identifyCameras();

            if (self.cameras.length > 0) {
              // Start with back camera by default if available
              var startCameraId = self.backCameraId || self.cameras[0].id;
              self.activeCameraId = startCameraId;
              self.scanStatus = 'Starting camera...';
              self.startCamera(startCameraId);
            } else {
              self.scanStatus = 'No cameras available';
            }
          } else {
            console.log('No video input devices found');
            self.scanStatus = 'No cameras found - please check your camera connection';
          }
        })
        .catch(function(e) {
          console.error('Camera enumeration failed:', e);
          self.scanStatus = 'Camera enumeration failed: ' + e.message;
        });
    },

    // ZXing initialization
    initializeZxingScanner: function() {
      var self = this;

      console.log('Initializing ZXing scanner...');

      // Check if ZXing library is available
      if (typeof ZXing === 'undefined') {
        console.error('ZXing library not loaded');
        self.scanStatus = 'Error: ZXing library not loaded';
        return;
      }

      // Check if Scanner class is available
      if (typeof Scanner === 'undefined') {
        console.error('ZXing Scanner class not loaded');
        self.scanStatus = 'Error: ZXing Scanner class not loaded';
        return;
      }

      self.scanStatus = 'Getting cameras...';

      // Use ZXing camera management
      Camera.getCameras().then(function(cameras) {
        console.log('Cameras found:', cameras);

        if (cameras && cameras.length) {
          self.cameras = cameras.map(camera => ({
            id: camera.id,
            name: camera.name || `Camera ${camera.id}`
          }));

          console.log('Processed cameras:', self.cameras);

          // Identify front and back cameras
          self.identifyCameras();

          if (self.cameras.length > 0) {
            // Start with back camera by default if available
            var startCameraId = self.backCameraId || self.cameras[0].id;
            self.activeCameraId = startCameraId;
            self.scanStatus = 'Starting camera...';
            self.startCamera(startCameraId);
          } else {
            self.scanStatus = 'No cameras available';
          }
        } else {
          self.scanStatus = 'No cameras found';
        }
      }).catch(function (e) {
        console.error('Camera enumeration failed:', e);
        self.scanStatus = 'Camera access denied or not available';
      });
    },

    // Camera management
    formatName: function (name) {
      return name || '(unknown)';
    },

    selectCamera: function (camera) {
      var self = this;
      self.activeCameraId = camera.id;

      // Update current facing mode based on selected camera
      var cameraName = camera.name.toLowerCase();
      if (cameraName.includes('front') || cameraName.includes('facing front') || cameraName.includes('user')) {
        self.currentFacingMode = 'user';
      } else if (cameraName.includes('back') || cameraName.includes('rear') || cameraName.includes('environment')) {
        self.currentFacingMode = 'environment';
      } else {
        // If can't determine from name, use heuristic
        if (camera.id === self.frontCameraId) {
          self.currentFacingMode = 'user';
        } else if (camera.id === self.backCameraId) {
          self.currentFacingMode = 'environment';
        }
      }

      self.startCamera(camera.id);

      // Close sidebar on mobile after camera selection
      if (window.innerWidth <= 768) {
        setTimeout(function() {
          self.closeSidebar();
        }, 300);
      }
    },

    startCamera: function (cameraId) {
      var self = this;
      console.log('Starting camera with ID:', cameraId);

      if (self.selectedLibrary === 'html5') {
        self.startHtml5Camera(cameraId);
      } else if (self.selectedLibrary === 'jsqr') {
        self.startJsQRCamera(cameraId);
      } else if (self.selectedLibrary === 'zxing') {
        self.startZxingCamera(cameraId);
      }
    },

    // HTML5-QRCode camera start
    startHtml5Camera: function (cameraId) {
      var self = this;

      if (self.scanner.isScanning) {
        console.log('Scanner is already running, stopping first...');
        self.scanner.stop().then(function () {
          self.startHtml5Scanning(cameraId);
        }).catch(function (e) {
          console.error('Failed to stop scanning:', e);
          self.scanStatus = 'Error: Failed to stop previous scan';
        });
      } else {
        self.startHtml5Scanning(cameraId);
      }
    },

    startHtml5Scanning: function (cameraId) {
      var self = this;
      console.log('Starting HTML5 scan with camera:', cameraId);

      self.scanner.start(
        cameraId,
        {
          fps: 10
        },
        function (decodedText, decodedResult) {
          console.log('QR Code detected:', decodedText);
          self.scans.unshift({ date: +(Date.now()), content: decodedText });
          self.scanStatus = 'QR Code successfully scanned!';
          self.lastScanAttempt = Date.now();

          // Optional: Play a success sound or vibration
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        },
        function (errorMessage) {
          // Reduce console spam - only log every 10th error
          if (!self.errorCount) self.errorCount = 0;
          self.errorCount++;

          if (self.errorCount % 10 === 0) {
            console.warn('Scan attempt failed:', errorMessage);
          }

          self.handleScanFailure(errorMessage);
        }
      ).then(function () {
        console.log('HTML5 scanner started successfully');
        self.scanStatus = 'Scanning... position QR code in frame';
      }).catch(function (e) {
        console.error('Unable to start HTML5 scanning:', e);
        self.scanStatus = 'Failed to start camera: ' + e.message;
      });
    },

    // jsQR camera start
    startJsQRCamera: function (cameraId) {
      var self = this;

      // Stop existing stream
      self.stopScanning();

      // Enhanced camera constraints with fallback options
      var constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          deviceId: cameraId ? { exact: cameraId } : undefined,
          facingMode: cameraId ? undefined : 'environment'
        }
      };

      console.log('Starting jsQR camera with constraints:', constraints);
      self.scanStatus = 'Requesting camera access...';

      // Start the camera stream with retry logic
      navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          console.log('jsQR camera stream started successfully');

          // Ensure video element exists and is properly configured
          if (!self.videoElement) {
            self.videoElement = document.getElementById('preview-video');
          }
          if (!self.canvasElement) {
            self.canvasElement = document.getElementById('canvas');
          }
          if (!self.canvasContext) {
            self.canvasContext = self.canvasElement.getContext('2d');
          }

          self.videoElement.srcObject = stream;

          // Set up video event listeners for better error handling
          self.videoElement.addEventListener('loadedmetadata', function() {
            console.log('Video metadata loaded, dimensions:',
              self.videoElement.videoWidth + 'x' + self.videoElement.videoHeight);

            // Set canvas dimensions to match video
            self.canvasElement.width = self.videoElement.videoWidth;
            self.canvasElement.height = self.videoElement.videoHeight;

            // Start playing video
            self.videoElement.play().then(function() {
              console.log('Video playback started');
              self.scanStatus = 'Scanning... position QR code in frame';
              self.scanningActive = true;
              self.scanFrame();
            }).catch(function(e) {
              console.error('Video playback failed:', e);
              self.scanStatus = 'Failed to start video playback';
            });
          });

          self.videoElement.addEventListener('error', function(e) {
            console.error('Video element error:', e);
            self.scanStatus = 'Video error - please try a different camera';
          });

          // Add timeout for video loading
          setTimeout(function() {
            if (self.videoElement.readyState < 2) {
              console.warn('Video loading timeout');
              self.scanStatus = 'Camera loading timeout - please try again';
            }
          }, 5000);

        })
        .catch(function(e) {
          console.error('Unable to access camera:', e);

          // Provide more specific error messages
          var errorMessage = 'Failed to start camera';
          if (e.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied - please allow camera permissions';
          } else if (e.name === 'NotFoundError') {
            errorMessage = 'Camera not found - please check your camera connection';
          } else if (e.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application';
          } else if (e.name === 'OverconstrainedError') {
            errorMessage = 'Camera constraints not supported - trying with basic settings';
            // Retry with basic constraints
            self.startJsQRCameraBasic();
            return;
          }

          self.scanStatus = errorMessage + ': ' + e.message;
        });
    },

    // Fallback method for starting camera with basic constraints
    startJsQRCameraBasic: function() {
      var self = this;
      var basicConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      console.log('Retrying with basic constraints:', basicConstraints);

      navigator.mediaDevices.getUserMedia(basicConstraints)
        .then(function(stream) {
          console.log('Basic camera stream started successfully');
          self.videoElement.srcObject = stream;
          self.videoElement.play();

          self.videoElement.addEventListener('loadedmetadata', function() {
            self.canvasElement.width = self.videoElement.videoWidth;
            self.canvasElement.height = self.videoElement.videoHeight;
            self.scanStatus = 'Scanning... position QR code in frame';
            self.scanningActive = true;
            self.scanFrame();
          });
        })
        .catch(function(e) {
          console.error('Basic camera access also failed:', e);
          self.scanStatus = 'Camera access completely failed - please check browser permissions';
        });
    },

    // jsQR frame scanning
    scanFrame: function () {
      var self = this;

      if (!self.scanningActive) {
        return;
      }

      if (self.videoElement.readyState === self.videoElement.HAVE_ENOUGH_DATA) {
        // Draw current video frame to canvas
        self.canvasContext.drawImage(self.videoElement, 0, 0, self.canvasElement.width, self.canvasElement.height);

        // Get image data for QR code scanning
        var imageData = self.canvasContext.getImageData(0, 0, self.canvasElement.width, self.canvasElement.height);

        // Scan for QR code using jsQR
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          console.log('QR Code detected:', code.data);
          self.scans.unshift({ date: +(Date.now()), content: code.data });
          self.scanStatus = 'QR Code successfully scanned!';
          self.lastScanAttempt = Date.now();

          // Optional: Play a success sound or vibration
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // Pause briefly after successful scan to avoid duplicate scans
          self.scanningActive = false;
          setTimeout(function() {
            self.scanningActive = true;
            self.scanFrame();
          }, 1000);
          return;
        } else {
          self.handleScanFailure();
        }
      }

      // Continue scanning
      self.animationFrame = requestAnimationFrame(function() {
        self.scanFrame();
      });
    },

    // ZXing camera start
    startZxingCamera: function(cameraId) {
      var self = this;

      // Stop existing scanner
      self.stopScanning();

      try {
        // Find the camera object
        var camera = null;
        for (var i = 0; i < self.cameras.length; i++) {
          if (self.cameras[i].id === cameraId) {
            camera = self.cameras[i];
            break;
          }
        }

        if (!camera) {
          console.error('Camera not found:', cameraId);
          self.scanStatus = 'Error: Camera not found';
          return;
        }

        // Get video element
        var videoElement = document.getElementById('zxing-video');
        if (!videoElement) {
          console.error('ZXing video element not found');
          self.scanStatus = 'Error: Video element not found';
          return;
        }

        // Create ZXing camera object
        var zxingCamera = new Camera(cameraId, camera.name);

        // Create ZXing scanner
        self.scanner = new Scanner({
          video: videoElement,
          mirror: false,
          captureImage: false,
          continuous: true
        });

        // Set up scan event listener
        self.scanner.on('scan', function(content, image) {
          console.log('ZXing QR Code detected:', content);
          self.scans.unshift({ date: +(Date.now()), content: content });
          self.scanStatus = 'QR Code successfully scanned!';
          self.lastScanAttempt = Date.now();

          // Optional: Play a success sound or vibration
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        });

        // Set up event listeners for scanner state
        self.scanner.on('active', function() {
          console.log('ZXing scanner active');
          self.scanStatus = 'Scanning... position QR code in frame';
        });

        self.scanner.on('inactive', function() {
          console.log('ZXing scanner inactive');
        });

        // Start the scanner with the camera
        self.scanner.start(zxingCamera).then(function() {
          console.log('ZXing scanner started successfully');
          self.scanStatus = 'Scanning... position QR code in frame';
        }).catch(function(e) {
          console.error('Unable to start ZXing scanner:', e);
          self.scanStatus = 'Failed to start ZXing scanner: ' + e.message;
        });

      } catch (e) {
        console.error('Error initializing ZXing scanner:', e);
        self.scanStatus = 'Error initializing ZXing scanner: ' + e.message;
      }
    },

    // Stop scanning (works for all libraries)
    stopScanning: function () {
      var self = this;

      if (self.selectedLibrary === 'html5' && self.scanner && self.scanner.isScanning) {
        self.scanner.stop().then(function() {
          console.log('HTML5 scanner stopped');
        }).catch(function(e) {
          console.error('Failed to stop HTML5 scanner:', e);
        });
      } else if (self.selectedLibrary === 'jsqr') {
        self.scanningActive = false;

        // Stop animation frame
        if (self.animationFrame) {
          cancelAnimationFrame(self.animationFrame);
          self.animationFrame = null;
        }

        // Stop video stream
        if (self.videoElement && self.videoElement.srcObject) {
          var tracks = self.videoElement.srcObject.getTracks();
          tracks.forEach(function(track) {
            track.stop();
          });
          self.videoElement.srcObject = null;
        }
      } else if (self.selectedLibrary === 'zxing' && self.scanner) {
        // Stop ZXing scanner
        self.scanner.stop().then(function() {
          console.log('ZXing scanner stopped');
        }).catch(function(e) {
          console.error('Failed to stop ZXing scanner:', e);
        });
      }
    },

    // Error handling
    handleScanFailure: function (errorMessage) {
      var self = this;
      self.lastScanAttempt = Date.now();

      // Update status based on error type
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('No QR code found')) {
          self.scanStatus = 'No QR code detected';
        } else if (errorMessage.includes('MultiFormatReader') || errorMessage.includes('NotFoundException')) {
          self.scanStatus = 'QR code unreadable - improve lighting/position';
        } else if (errorMessage.includes('Camera')) {
          self.scanStatus = 'Camera issue detected';
        } else {
          self.scanStatus = 'Scanning...';
        }
      } else {
        self.scanStatus = 'Scanning... position QR code in frame';
      }
    },

    // Camera switching methods
    identifyCameras: function() {
      var self = this;
      self.frontCameraId = null;
      self.backCameraId = null;

      // Try to identify front and back cameras from labels
      self.cameras.forEach(function(camera) {
        var label = camera.name.toLowerCase();
        if (label.includes('front') || label.includes('facing front') || label.includes('user')) {
          self.frontCameraId = camera.id;
        } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          self.backCameraId = camera.id;
        }
      });

      // If couldn't identify by labels, use heuristic based on camera order
      if (!self.frontCameraId && !self.backCameraId && self.cameras.length >= 2) {
        // On most devices, the first camera is back, second is front
        self.backCameraId = self.cameras[0].id;
        self.frontCameraId = self.cameras[1].id;
      } else if (!self.frontCameraId && !self.backCameraId && self.cameras.length === 1) {
        // Only one camera available, assume it's back camera
        self.backCameraId = self.cameras[0].id;
      }

      console.log('Identified cameras - Front:', self.frontCameraId, 'Back:', self.backCameraId);
    },

    toggleCamera: function() {
      var self = this;

      // Identify cameras if not already done
      if (!self.frontCameraId && !self.backCameraId) {
        self.identifyCameras();
      }

      // Determine which camera to switch to
      var targetCameraId = null;
      var targetFacingMode = null;

      if (self.currentFacingMode === 'environment') {
        // Currently using back camera, switch to front
        targetCameraId = self.frontCameraId;
        targetFacingMode = 'user';
      } else {
        // Currently using front camera, switch to back
        targetCameraId = self.backCameraId;
        targetFacingMode = 'environment';
      }

      if (!targetCameraId) {
        console.warn('Target camera not found, falling back to first available camera');
        if (self.cameras.length > 0) {
          targetCameraId = self.cameras[0].id;
          targetFacingMode = 'environment';
        } else {
          self.scanStatus = 'No cameras available for switching';
          return;
        }
      }

      console.log('Switching camera to:', targetCameraId, 'Facing mode:', targetFacingMode);
      self.currentFacingMode = targetFacingMode;
      self.activeCameraId = targetCameraId;

      // Start the new camera
      self.startCamera(targetCameraId);

      // Close sidebar on mobile after camera switching
      if (window.innerWidth <= 768) {
        setTimeout(function() {
          self.closeSidebar();
        }, 300);
      }
    },

    hasMultipleCameras: function() {
      var self = this;
      return self.cameras.length >= 2 || (self.frontCameraId && self.backCameraId);
    },

    getCameraIcon: function() {
      var self = this;
      return self.currentFacingMode === 'environment' ? '📱' : '🤳';
    },

    // URL detection
    getScanHref: function (content) {
      if (!content || typeof content !== 'string') return null;
      // Quick check: if content already looks like a URL with scheme
      try {
        var url = new URL(content);
        return url.href;
      } catch (e) {
        // If missing scheme but looks like a domain (e.g. example.com/path), prepend http://
        var looksLikeDomain = /^([\w-]+\.)+[\w-]{2,}(:\d+)?(\/.*)?$/i;
        if (looksLikeDomain.test(content)) {
          return 'http://' + content;
        }
      }
      return null;
    }
  },
  beforeDestroy: function () {
    // Clean up when component is destroyed
    this.stopScanning();
  }
});