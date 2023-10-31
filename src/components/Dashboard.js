import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import './style/Dashboard.css';


function App() {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const chartRefs = useRef({
        geo: React.createRef(),
        userEngagement: React.createRef(),
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
                    case "geo":
                        const cities = value.map(d => d.geo.city || 'Unknown'); // Use 'city' instead of 'country'

                        const cityCounts = cities.reduce((acc, city) => {
                            acc[city] = (acc[city] || 0) + 1;
                            return acc;
                        }, {});

                        chartConfig = {
                            type: 'pie',
                            data: {
                                labels: Object.keys(cityCounts),
                                datasets: [{
                                    data: Object.values(cityCounts),
                                    backgroundColor: [
                                        'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'magenta'
                                    ]
                                }]
                            }
                        };
                        break;

                    case "technology":
                        const browsers = value.map(d => d.browser || 'Unknown');
                        const oses = value.map(d => d.operating_system || 'Unknown');
                        const browserCounts = value.map(d => d.browser_count || 0);
                        const osCounts = value.map(d => d.os_count || 0);
                        chartConfig = {
                            type: 'pie',
                            data: {
                                labels: [...new Set([...browsers, ...oses])],
                                datasets: [{
                                    data: [...browserCounts, ...osCounts],
                                    backgroundColor: [
                                        'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'magenta'
                                    ]
                                }]
                            }
                        };
                        break;

                    case "acquisition":
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: value.map(d => `${d.source || 'Unknown'}/${d.medium || 'Unknown'}`),
                                datasets: [{
                                    label: 'Source and Medium Counts',
                                    data: value.map(d => d.source_count),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                    case "behaviorFlow":
                        chartConfig = {
                            type: 'line',
                            data: {
                                labels: value.map(d => d.event_bundle_sequence_id),
                                datasets: [{
                                    label: 'Behavior Flow',
                                    data: value.map(d => d.event_bundle_sequence_id),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                    case "userRetention":
                        chartConfig = {
                            type: 'line',
                            data: {
                                labels: value.map(d => d.date),
                                datasets: [{
                                    label: 'User Retention',
                                    data: value.map(d => d.retained_users),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                    case "eventPopularity":
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: value.map(d => d.event_name),
                                datasets: [{
                                    label: 'Event Popularity',
                                    data: value.map(d => d.event_count),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                    case "trafficSourceAnalysis":
                        chartConfig = {
                            type: 'pie',
                            data: {
                                labels: value.map(d => d.source),
                                datasets: [{
                                    data: value.map(d => d.source_count),
                                    backgroundColor: [
                                        'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'magenta'
                                    ]
                                }]
                            }
                        };
                        break;
                    case "userActivityOverTime":
                        chartConfig = {
                            type: 'line',
                            data: {
                                labels: value.map(d => d.date),
                                datasets: [{
                                    label: 'User Activity Over Time',
                                    data: value.map(d => d.user_count),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                    case "userEngagement":
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: value.map(d => d.event_name),
                                datasets: [{
                                    label: 'User Engagement',
                                    data: value.map(d => d.event_count),
                                    backgroundColor: 'blue'
                                }]
                            }
                        };
                        break;

                }

                if (Object.keys(chartConfig).length) {
                    try {
                        chartInstances.current[key] = new Chart(chartRefs.current[key].current, chartConfig);
                        console.log(`Chart for key ${key} rendered successfully.`);
                    } catch (error) {
                        console.error(`Error rendering chart for key ${key}:`, error);
                    }
                }
            });
        }
    }, [isLoading, data]);

    // Inside your return statement
    return (
        <div className="Dashboard">
            {hasError ?
                <div>Error occurred while fetching data. Please try again later.</div>
                :
                Object.keys(data).map((key) => (
                    <div key={key} className="chart-container">
                        <canvas ref={chartRefs.current[key]}></canvas>
                    </div>
                ))
            }
        </div>
    );

}

export default App;
