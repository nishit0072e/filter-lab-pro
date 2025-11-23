
# FilterLab Pro 🎛️

**FilterLab Pro** is a comprehensive Digital Signal Processing (DSP) suite built with React. It provides an interactive environment for designing, analyzing, and simulating analog and digital filters, as well as adaptive filtering algorithms.

## 🚀 Features
### 1. Study Assistive Filter Design Engine
-   **Domains:** Analog (s-domain), Digital IIR (z-domain via Bilinear Transform), and Digital FIR.
-   **Topologies:** * **IIR/Analog:** Butterworth, Chebyshev Type I & II, Elliptic (Cauer), Bessel (Linear Phase).
    -   **FIR:** Window Method (Hamming, Hanning, Blackman, Rectangular) and **Parks-McClellan (Remez Exchange)** optimization.
-   **Response Types:** Lowpass, Highpass, Bandpass, Bandstop, Notch.
### 2. Deep Analysis Tools
-   **Interactive Plots:** Real-time Bode plots (Magnitude & Phase) and Time Domain response (Impulse/Step).
-   **Pole-Zero Analysis:** Interactive s-plane and z-plane scatter plots with automatic stability detection.
-   **Metrics:** Group delay variation, estimated quantization noise, and passband ripple calculations.
### 3. Adaptive Filter Simulation
-   **Algorithms:** Least Mean Squares (**LMS**), Recursive Least Squares (**RLS**), and **Kalman Filter**.
-   **Visualization:** Real-time convergence tracking of weights and error signals in noise cancellation scenarios.
### 4. Utilities (Under development)
-   **Export:** Download frequency response data as CSV.
-   **Auto-Tune:** "Advice" widget estimating phase lag and stability based on current parameters.
## 🛠️ Tech Stack
-   **Frontend:** React (Vite)
-   **Styling:** Tailwind CSS
-   **Visualization:** Recharts
-   **Icons:** Lucide React
## 📦 Installation & Local Development
1.  **Clone the repository:**
    ```
    git clone [https://github.com/](https://github.com/)<YOUR_USERNAME>/filter-lab-pro.git
    cd filter-lab-pro
    ```
2.  **Install dependencies:**  
    ```
    npm install
    ```
3.  **Run the development server:** 
    ```
    npm run dev
    ```
5.  Open your browser to `http://localhost:5173`.

## 🌐 Deployment to GitHub Pages
This project is configured for easy deployment to GitHub Pages using the `gh-pages` package.
1.  **Configure `package.json`:** Ensure the `homepage` field matches your repository URL:
    ```
    "homepage": "https://<YOUR_GITHUB_USERNAME>.github.io/filter-lab-pro"
    ```
2.  **Configure `vite.config.js`:** Ensure the `base` path matches your repository name:
    ```
    base: '/filter-lab-pro/',
    ```
3.  **Deploy:** Run the deployment script:
    ```
    npm run deploy
    ```
    This will build the project and push it to a `gh-pages` branch on your repository.
## 🤝 Contribution
Contributions are welcome! Please feel free to submit a Pull Request.
1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
