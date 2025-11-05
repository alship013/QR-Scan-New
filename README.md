# QR Scanner Combined

A unified QR code scanning application that combines both **HTML5-QRCode** and **jsQR** libraries, allowing you to switch between them based on your needs.

## Features

- **Dual Library Support**: Switch between HTML5-QRCode and jsQR scanning engines
- **Real-time Library Switching**: Change libraries without page reload
- **Camera Selection**: Support for multiple cameras with easy switching
- **Scan History**: View and interact with scanned QR codes
- **URL Detection**: Automatically detects and makes URLs clickable
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with visual feedback

## Library Comparison

### HTML5-QRCode
- **Features**: Rich feature set, supports multiple barcode formats
- **Ease of Use**: High-level API with built-in error handling
- **Performance**: Optimized for general-purpose scanning
- **Size**: Larger library with more dependencies
- **Best for**: Quick implementation, robust error handling, multi-format support

### jsQR
- **Features**: Lightweight, QR code focused
- **Performance**: Fast QR-specific scanning with manual control
- **Control**: Fine-grained control over scanning parameters
- **Size**: Smaller footprint
- **Best for**: Performance-critical applications, QR-only scanning, custom implementations

## Usage

1. **Open the Application**: Navigate to the `docs/index.html` file in a web browser
2. **Select Library**: Choose between HTML5-QRCode or jsQR in the sidebar
3. **Allow Camera Access**: Grant camera permissions when prompted
4. **Position QR Code**: Align the QR code within the scanning frame
5. **View Results**: Scanned codes appear in the history panel

## Browser Requirements

- **HTTPS Required**: Camera access requires a secure context (HTTPS or localhost)
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **WebRTC Support**: Browser must support `getUserMedia` API
- **JavaScript Enabled**: JavaScript must be enabled in browser settings

## File Structure

```
QRScan-Combined/
├── docs/
│   ├── index.html          # Main application interface
│   ├── app.js              # Vue.js application logic
│   ├── style.css           # Application styles
│   └── favicon.png         # Application icon
└── README.md               # This documentation
```

## Technical Details

### Architecture

The application uses Vue.js for reactive UI management and implements a unified interface that abstracts the differences between the two scanning libraries:

- **HTML5-QRCode Integration**: Uses the Html5Qrcode library for simplified scanning
- **jsQR Integration**: Manual video frame capture and processing using Canvas API
- **Dynamic Loading**: Both libraries are loaded but only the selected one is active
- **State Management**: Centralized state for camera management and scan results

### Library Switching

When switching libraries:
1. Current scanning is stopped
2. Scanner state is reset
3. New library is initialized
4. Camera enumeration is performed
5. Scanning starts with the selected library

### Error Handling

- **Camera Access**: Handles denied permissions and unavailable cameras
- **Library Loading**: Detects when libraries fail to load
- **Scanning Errors**: Provides user-friendly error messages
- **Browser Compatibility**: Checks for required browser features

## Development

### Local Testing

For local development with camera access, use a local server with HTTPS:

```bash
# Using Python 3
python -m http.server 8443 --bind localhost

# Using Node.js
npx http-server -p 8443 -S -C cert.pem -K key.pem

# Or any other local server with HTTPS support
```

Then access `https://localhost:8443/docs/` in your browser.

### Customization

To modify the application:

1. **UI Changes**: Edit `style.css` for visual customizations
2. **Behavior Changes**: Modify `app.js` for functionality changes
3. **Library Settings**: Adjust scanning parameters in the library-specific methods
4. **Add Features**: Extend the Vue.js application with new components

## Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS or localhost
- Check browser camera permissions
- Verify camera is not being used by another application
- Try refreshing the page and granting permissions again

### QR Code Not Scanning
- Ensure adequate lighting
- Position QR code within the guide frame
- Hold device steady
- Try different QR codes to verify functionality
- Switch between libraries to test different implementations

### Library Switching Issues
- Wait for current library to fully stop before switching
- Check browser console for error messages
- Refresh the page if issues persist

## License

This project combines the following open-source libraries:

- **HTML5-QRCode**: Licensed under the MIT License
- **jsQR**: Licensed under the Apache License 2.0
- **Vue.js**: Licensed under the MIT License

Please refer to individual library licenses for specific terms and conditions.

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with both libraries
5. Submit a pull request with a clear description of changes

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Verify browser compatibility and requirements
3. Review browser console for error messages
4. Test with different QR codes and cameras
5. Try both libraries to isolate library-specific issues