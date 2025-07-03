<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Chart Publik E-Voting</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js"></script>
    <style>
        /* Custom CSS for theme and animations */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f0f4f8; /* Light gray background */
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
        }
        .container {
            background-color: #ffffff;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            width: 100%;
            max-width: 1000px; /* Wider for chart */
            padding: 30px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .header {
            background: linear-gradient(to right, #004d40, #0D47A1); /* Dark Green to Dark Blue */
            color: white;
            padding: 25px 30px;
            border-radius: 10px;
            text-align: center;
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            animation: slideInTop 0.8s ease-out;
        }
        /* Animations */
        @keyframes slideInTop {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }

        /* Loading Spinner */
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #0D47A1;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Message Box */
        .message-box {
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            padding: 25px;
            text-align: center;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            max-width: 400px;
            width: 90%;
        }
        .message-box-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999;
        }
    </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-5">
    <div class="container">
        <div class="header">
            Pimpinan Wilayah Muhammadiyah Jawa Barat
            <div class="text-sm font-normal mt-2">Panel Chart Publik E-Voting</div>
        </div>

        <!-- Loading Overlay -->
        <div id="loadingOverlay" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[1000] hidden">
            <div class="spinner"></div>
            <p class="text-white ml-3 text-lg">Memuat data...</p>
        </div>

        <!-- Message Box Container -->
        <div id="messageBoxContainer" class="hidden"></div>

        <div class="text-center mb-6">
            <p class="text-xl font-semibold text-gray-700">Total Pemilih: <span id="totalVoters" class="text-blue-600">0</span></p>
            <p class="text-xl font-semibold text-gray-700">Sudah Memilih: <span id="votedCount" class="text-green-600">0</span></p>
            <p class="text-sm text-gray-500 mt-2">Data diperbarui setiap 5 detik.</p>
        </div>

        <div class="w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-gray-50 rounded-lg p-4 shadow-inner">
            <canvas id="publicResultsChart"></canvas>
        </div>
    </div>

    <script>
        // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyBp5tqBOYzxbmf70pmUs7FyQBhl0Tbg0XY",
            authDomain: "pemilihan-wakasek-muhika.firebaseapp.com",
            databaseURL: "https://pemilihan-wakasek-muhika-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "pemilihan-wakasek-muhika",
            storageBucket: "pemilihan-wakasek-muhika.firebasestorage.app",
            messagingSenderId: "1094339172947",
            appId: "1:1094339172947:web:0ca57c112d7afc6879c4a6"
        };

        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        const candidatesRef = database.ref('candidates');
        const votersRef = database.ref('voters');
        const totalVotersCountRef = database.ref('totalVotersCount');

        // DOM Elements
        const publicResultsChartCanvas = document.getElementById('publicResultsChart');
        const totalVotersDisplay = document.getElementById('totalVoters');
        const votedCountDisplay = document.getElementById('votedCount');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const messageBoxContainer = document.getElementById('messageBoxContainer');

        let chartInstance = null;
        let totalVoters = 0;

        // --- Utility Functions ---

        // Show loading overlay
        function showLoading() {
            loadingOverlay.classList.remove('hidden');
        }

        // Hide loading overlay
        function hideLoading() {
            loadingOverlay.classList.add('hidden');
        }

        // Custom Message Box instead of alert/confirm
        function showMessageBox(title, message, type = 'info', onConfirm = null) {
            const overlay = document.createElement('div');
            overlay.className = 'message-box-overlay';
            overlay.id = 'messageBoxOverlay';

            const box = document.createElement('div');
            box.className = 'message-box';
            box.innerHTML = `
                <h3 class="text-xl font-bold mb-3 ${type === 'error' ? 'text-red-600' : 'text-blue-700'}">${title}</h3>
                <p class="text-gray-700 mb-5">${message}</p>
                <button id="messageBoxCloseBtn" class="btn-primary w-full">OK</button>
            `;

            messageBoxContainer.innerHTML = ''; // Clear previous messages
            messageBoxContainer.appendChild(overlay);
            messageBoxContainer.appendChild(box);
            messageBoxContainer.classList.remove('hidden');

            const closeBtn = document.getElementById('messageBoxCloseBtn');
            closeBtn.onclick = () => {
                messageBoxContainer.classList.add('hidden');
                messageBoxContainer.innerHTML = '';
                if (onConfirm) onConfirm();
            };
        }

        // Disable Developer Tools and Right-Click (basic client-side security)
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('keydown', event => {
            if (event.key === 'F12' ||
                (event.ctrlKey && event.shiftKey && event.key === 'I') ||
                (event.ctrlKey && event.shiftKey && event.key === 'J') ||
                (event.ctrlKey && event.key === 'U') ||
                (event.metaKey && event.altKey && event.key === 'I') // For Mac
            ) {
                event.preventDefault();
                showMessageBox('Akses Terbatas', 'Inspeksi elemen tidak diizinkan untuk keamanan sistem.');
            }
        });

        // --- Chart Rendering Function ---
        async function renderPublicChart() {
            showLoading();
            try {
                const candidatesSnapshot = await candidatesRef.once('value');
                const candidatesData = candidatesSnapshot.val();

                const votersSnapshot = await votersRef.once('value');
                const votersData = votersSnapshot.val();

                let votedCount = 0;
                if (votersData) {
                    Object.values(votersData).forEach(voter => {
                        if (voter.used) {
                            votedCount++;
                        }
                    });
                }
                votedCountDisplay.textContent = votedCount;

                const totalVotersSnapshot = await totalVotersCountRef.once('value');
                totalVoters = totalVotersSnapshot.val() || 0;
                totalVotersDisplay.textContent = totalVoters;


                if (candidatesData) {
                    const labels = [];
                    const data = [];
                    const backgroundColors = [];
                    const borderColors = [];

                    const colors = [
                        'rgba(13, 71, 161, 0.8)', // Dark Blue
                        'rgba(0, 77, 64, 0.8)',   // Dark Green
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(201, 203, 207, 0.8)',
                        'rgba(100, 100, 100, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(255, 0, 0, 0.8)',
                        'rgba(0, 255, 0, 0.8)',
                        'rgba(0, 0, 255, 0.8)'
                    ];

                    // Sort candidates by votes in descending order
                    const sortedCandidates = Object.values(candidatesData).sort((a, b) => b.votes - a.votes);

                    sortedCandidates.forEach((candidate, index) => {
                        labels.push(candidate.name);
                        data.push(candidate.votes);
                        backgroundColors.push(colors[index % colors.length]);
                        borderColors.push(colors[index % colors.length].replace('0.8', '1'));
                    });

                    if (chartInstance) {
                        chartInstance.data.labels = labels;
                        chartInstance.data.datasets[0].data = data;
                        chartInstance.data.datasets[0].backgroundColor = backgroundColors;
                        chartInstance.data.datasets[0].borderColor = borderColors;
                        chartInstance.update();
                    } else {
                        chartInstance = new Chart(publicResultsChartCanvas, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Jumlah Suara',
                                    data: data,
                                    backgroundColor: backgroundColors,
                                    borderColor: borderColors,
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y', // Horizontal bars
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    title: {
                                        display: true,
                                        text: 'Hasil Klasemen Pemilihan Wakasek',
                                        font: {
                                            size: 24,
                                            weight: 'bold'
                                        },
                                        color: '#333'
                                    }
                                },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Jumlah Suara',
                                            font: {
                                                size: 16
                                            },
                                            color: '#555'
                                        },
                                        ticks: {
                                            stepSize: 1,
                                            color: '#555'
                                        },
                                        grid: {
                                            color: 'rgba(0, 0, 0, 0.05)'
                                        }
                                    },
                                    y: {
                                        ticks: {
                                            color: '#555',
                                            font: {
                                                size: 14
                                            }
                                        },
                                        grid: {
                                            display: false
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Error rendering public chart:", error);
                showMessageBox('Error', 'Gagal memuat chart publik. Silakan refresh halaman.', 'error');
            } finally {
                hideLoading();
            }
        }

        // Initial render and refresh every 5 seconds
        window.onload = () => {
            renderPublicChart();
            setInterval(renderPublicChart, 5000); // Refresh every 5 seconds
        };
    </script>
</body>
</html>
