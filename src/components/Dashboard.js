import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

function App() {
    const [deviceData, setDeviceData] = useState([]);
    const [userCount, setUserCount] = useState(0); // Track the total number of users
    const [chart1, setChart1] = useState(null); // Chart for mobile OS
    const [chart2, setChart2] = useState(null); // Chart for user geo data

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Make an HTTP request to your Express server's endpoint for device data
                const result = await axios.get('http://localhost:3001/api/kpi/mobile');
                const data = result.data.mobile;

                // Count the data based on the operating_system field
                const counts = countOperatingSystems(data);

                // Set the device data and user count to the state
                setDeviceData(counts);
                setUserCount(data.length);

                // Create the chart data based on the counts
                const chartData1 = createMobileOSChart(counts);
                const chartData2 = await fetchGeoData(); // Fetch geo data and create chart data

                if (chart1) {
                    chart1.data = chartData1;
                    chart1.update();
                } else {
                    const ctx1 = document.getElementById('mobileOSChart').getContext('2d');
                    const newChart1 = new Chart(ctx1, {
                        type: 'bar',
                        data: chartData1,
                        // Add chart options as needed
                    });
                    setChart1(newChart1);
                }

                if (chart2) {
                    chart2.data = chartData2;
                    chart2.update();
                } else {
                    const ctx2 = document.getElementById('geoChart').getContext('2d');
                    const newChart2 = new Chart(ctx2, {
                        type: 'bar',
                        data: chartData2,
                        // Add chart options as needed
                    });
                    setChart2(newChart2);
                }

            } catch (error) {
                console.error('There was a problem fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const countOperatingSystems = (data) => {
        // Count operating systems
        let androidCount = 0;
        let iPhoneCount = 0;
        let otherCount = 0;

        data.forEach((device) => {
            if (device && device.device && device.device.operating_system) {
                const os = device.device.operating_system.toLowerCase();
                if (os.includes('android')) {
                    androidCount++;
                } else if (os.includes('iphone')) {
                    iPhoneCount++;
                } else {
                    otherCount++;
                }
            }
        });

        return {
            Android: androidCount,
            iPhone: iPhoneCount,
            Other: otherCount,
        };
    };

    const createMobileOSChart = (counts) => {
        const labels = ['Android', 'iPhone', 'Other'];
        const dataValues = [counts.Android, counts.iPhone, counts.Other];

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Number of Users',
                    data: dataValues,
                    backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(255, 205, 86, 0.6)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 205, 86, 1)'],
                    borderWidth: 1,
                },
            ],
        };
    };

    const fetchGeoData = async () => {
        try {
            // Make an HTTP request to your Express server's endpoint for geo data
            const result = await axios.get('http://localhost:3001/api/kpi/geo');
            const geoData = result.data.geo;
    
            // Process and create chart data based on geo data
            const chartData = processGeoData(geoData);
    
            return chartData;
        } catch (error) {
            console.error('Error fetching geo data:', error);
            return null;
        }
    };
    
    const processGeoData = (geoData) => {
        // Initialize an empty object to store the counts of users per country
        const countryCounts = {};
    
        // Iterate through geoData and count the number of occurrences of each country
        geoData.forEach((data) => {
            if (data && data.geo && data.geo.country) { // Adjusted to read country from 'geo' field
                const country = data.geo.country; // Adjusted to read country from 'geo' field
                if (countryCounts[country]) {
                    countryCounts[country] += 1;
                } else {
                    countryCounts[country] = 1;
                }
            }
        });
    
        // Convert the keys and values in the countryCounts object into arrays for charting
        const labels = Object.keys(countryCounts);
        const dataValues = Object.values(countryCounts);
    
        // Return the data in a format compatible with Chart.js
        return {
            labels: labels,
            datasets: [
                {
                    label: 'Number of Users by Country',
                    data: dataValues,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
            ],
        };
    };
    
    return (
        <div className="App">
            <h1>Analytics Dashboard</h1>

            <div className="chart-container">
                <canvas id="mobileOSChart"></canvas>
            </div>

            <div className="chart-container">
                <canvas id="geoChart"></canvas>
            </div>

            <p>Total Users: {userCount}</p>
        </div>
    );
}

export default App;
