# Visual Subnet Calculator

A modern, interactive subnet calculator built with React and TypeScript that helps network administrators and IT professionals calculate and visualize IP subnets. Features a clean, responsive UI with dark/light mode support.

![Visual Subnet Calculator](screenshot.png)

## Features

- 🌐 Calculate subnet details including:
  - Subnet address
  - Netmask
  - Range of addresses
  - Useable IP addresses
  - Number of available hosts
- 🔄 Subnet manipulation:
  - Divide subnets into smaller networks
  - Join subnets back together
- 👁️ Customizable column visibility
- 🌓 Dark/Light mode with system preference detection
- 💾 Persistent theme settings
- 📱 Responsive design for all screen sizes

## Technologies Used

- React 18
- TypeScript
- Vite
- TailwindCSS
- Modern CSS features

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Vic563/visual-subnet-calculator.git
```

2. Navigate to the project directory:
```bash
cd visual-subnet-calculator
```

3. Install dependencies:
```bash
npm install
# or
yarn install
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and visit `http://localhost:5173`

## Usage

1. Enter the network address (e.g., 192.168.0.0) and subnet mask (e.g., /24)
2. Click "Update" to calculate subnet information
3. Use the "Divide" button to split a subnet into two equal subnets
4. Use the "Join" button to combine previously divided subnets
5. Toggle column visibility using the checkboxes
6. Switch between dark and light modes using the theme toggle button

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with React and TypeScript
- Styled with modern CSS features
- Inspired by the need for a modern, user-friendly subnet calculator 