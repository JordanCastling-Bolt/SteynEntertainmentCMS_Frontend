import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import './style/Dashboard.css';


function App() {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const chartRefs = useRef({
        mobile: React.createRef(),
        geo: React.createRef(),
        userEngagement: React.createRef(),
        user: React.createRef(),
        technology: React.createRef(),
        acquisition: React.createRef(),
        behaviorFlow: React.createRef(),
        userActivityOverTime: React.createRef(),
        userRetention: React.createRef(),
        eventPopularity: React.createRef(),
        trafficSourceAnalysis: React.createRef()
    });

    const chartInstances = useRef({});

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const endpoints = Object.keys(chartRefs.current);
                const fetchedData = await Promise.all(endpoints.map(endpoint => axios.get(`http://localhost:3001/api/kpi/${endpoint}`)));
                const newData = endpoints.reduce((acc, endpoint, index) => {
                    acc[endpoint] = fetchedData[index].data;
                    return acc;
                }, {});
                setData(newData);
            } catch (error) {
                console.error('Error fetching data:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [chartRefs]);

    useEffect(() => {
        // Destroy previous Chart instances
        Object.keys(chartInstances.current).forEach(key => {
            chartInstances.current[key]?.destroy();
        });

        const userData = data.user || []; // assuming 'user' key has user data
        const mobileData = data.mobile || []; // assuming 'mobile' key has mobile data

        const activeUsersCount = userData.filter(user => user.is_active_user).length;
        const totalUsersCount = userData.length;
        const activeUsersPercentage = (activeUsersCount / totalUsersCount) * 100;
        const osCounts = mobileData.reduce((accumulator, entry) => {
            const os = entry.operating_system;
            accumulator[os] = (accumulator[os] || 0) + 1;
            return accumulator;
        }, {});

        const countryCounts = (data.geo || []).reduce((acc, entry) => {
            const country = entry.geo.country;
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {});

        if (!isLoading && data) {
            Object.entries(data).forEach(([key, value]) => {
                let chartConfig = {};

                // Check if value is not an array and log the problematic key
                if (!Array.isArray(value)) {
                    console.warn(`Value for key ${key} is not an array:`, value);
                    return; // Skip this iteration if value is not an array
                }

                switch (key) {
                    case "userEngagement":
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: value.map(d => d.event_name),
                                datasets: [{
                                    label: 'Event Count',
                                    data: value.map(d => d.event_count),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;
                    case "userActivityOverTime":
                        chartConfig = {
                            type: 'line',
                            data: {
                                labels: value.map(d => (d.date ? d.date.value : null) || d.date),
                                datasets: [{
                                    label: key,
                                    data: value.map(d => d.user_count || d.retained_users),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;
                    case "mobile":
                        chartConfig = {
                            type: 'pie',
                            data: {
                                labels: Object.keys(osCounts),
                                datasets: [{
                                    data: Object.values(osCounts),
                                    backgroundColor: [
                                        // Add as many colors as required or generate dynamically
                                        'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'magenta'
                                    ]
                                }]
                            }
                        };
                        break;
                    case "geo":
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: Object.keys(countryCounts),
                                datasets: [{
                                    label: 'Number of Users',
                                    data: Object.values(countryCounts),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;
                        case "user":
                            chartConfig = {
                              type: 'doughnut',
                              data: {
                                labels: ['Active Users', 'Inactive Users'],
                                datasets: [{
                                  data: [activeUsersCount, totalUsersCount - activeUsersCount],
                                  backgroundColor: ['green', 'grey']
                                }]
                              },
                              options: {
                                title: {
                                  display: true,
                                  text: `Active Users: ${activeUsersPercentage.toFixed(2)}%`
                                }
                              }
                            };
                            break;
                    // For simplicity, other KPIs can be processed in a similar manner.
                    // Additional cases can be added based on KPI data structure.
                }

                if (Object.keys(chartConfig).length) {
                    chartInstances.current[key] = new Chart(chartRefs.current[key].current, chartConfig);
                }
            });
        }
    }, [isLoading, data]);

    return (
        <div className="Dashboard">
            {hasError ? <div>Error occurred while fetching data. Please try again later.</div> :
                Object.entries(chartRefs.current).map(([key, ref]) => (
                    <div key={key} style={{ width: '300px', height: '300px', margin: '20px' }}>
                        <canvas ref={ref}></canvas>
                    </div>
                ))}
        </div>
    );
}

export default App;
