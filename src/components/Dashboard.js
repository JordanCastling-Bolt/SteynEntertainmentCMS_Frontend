import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import './style/Dashboard.css';


function App() {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const chartRefs = useRef({
        userActivityOverTime: React.createRef(),
        user: React.createRef(),
        geo: React.createRef(),
        userEngagement: React.createRef(),
        technology: React.createRef(),
        behaviorFlow: React.createRef()
    });

    const handleResize = () => {
        setWindowWidth(window.innerWidth);
    };

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const chartInstances = useRef({});

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const endpoints = Object.keys(chartRefs.current);
                const fetchedData = await Promise.all(
                    endpoints.map(endpoint =>
                        axios.get(`https://localhost:3001/api/kpi/${endpoint}`))
                );
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
        const isValidDate = (d) => d instanceof Date && !isNaN(d);
        // Destroy previous Chart instances
        Object.keys(chartInstances.current).forEach(key => {
            chartInstances.current[key]?.destroy();
        });

        const userData = data.user || []; // assuming 'user' key has user data
        const mobileData = data.mobile || []; // assuming 'mobile' key has mobile data
        const activeUsersCount = userData.filter(user => user && user.is_active_user).length;
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
                        const cityCounts = value.reduce((acc, entry) => {
                            const city = entry.geo.city || 'Unknown';
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
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'City Distribution'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `City: ${context.label} - Count: ${context.raw}`
                                        }
                                    }
                                }
                            }
                        };
                        if (windowWidth < 768) {
                            chartConfig.options.plugins.tooltip.callbacks.label = (context) => `${context.label}`;
                            chartConfig.options.plugins.title.font.size = 14;
                            chartConfig.options.plugins.legend.labels.font.size = 10;
                        }
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
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Operating System Distribution'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `${context.dataset.label}: ${context.label} - Count: ${context.raw}`
                                        }
                                    }
                                }
                            }
                        };
                        if (windowWidth < 768) {
                            // Simplify tooltip content for smaller screens
                            chartConfig.options.plugins.tooltip.callbacks.label = (context) => `${context.label}: ${context.raw}`;

                            // Adjust the font size for the title and the legend labels
                            chartConfig.options.plugins.title.font.size = 14;
                            chartConfig.options.plugins.legend.labels.font.size = 10;

                            // Optionally, hide labels for smaller segments to reduce clutter
                            chartConfig.options.plugins.legend.labels.filter = (legendItem, data) => {
                                const value = data.datasets[0].data[legendItem.index];
                                return value > 0.05; // Set a suitable threshold value
                            };
                        }
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
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'User Behavior Flow'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `Sequence ID: ${context.label}`
                                        }
                                    }
                                }
                            }
                        };
                        if (windowWidth < 768) {
                            // Reduce the font size for the title and tooltips
                            chartConfig.options.plugins.title.font.size = 14;
                            chartConfig.options.plugins.tooltip.bodyFont.size = 12;

                            // Adjust the axis labels for better readability
                            chartConfig.options.scales.x.ticks.maxRotation = 45;
                            chartConfig.options.scales.x.ticks.minRotation = 45;
                            chartConfig.options.scales.x.ticks.font.size = 10;

                            // Reduce the number of ticks on the x-axis to avoid overcrowding
                            chartConfig.options.scales.x.ticks.autoSkip = true;
                            chartConfig.options.scales.x.ticks.maxTicksLimit = 5;
                        }
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
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'User Retention Over Time'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `Date: ${context.label} - Retained Users: ${context.raw}`
                                        }
                                    }
                                }
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
                            },
                            options: {
                                responsive: true,

                            }
                        };
                        break;


                    case "user":
                        // Assuming 'value' contains the array of user data
                        const userData = Array.isArray(value) ? value : [];

                        // Group data into date ranges (e.g., weekly)
                        const groupedData = {};
                        userData.forEach(item => {
                            const date = new Date(item.signup_day?.value ?? 'Invalid Date');
                            if (isValidDate(date)) {
                                // Format date to the beginning of the week
                                const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
                                const weekLabel = weekStart.toISOString().split('T')[0]; // Only show the starting date of the week

                                groupedData[weekLabel] = (groupedData[weekLabel] || 0) + (item.unique_user_count ?? 0);
                            }
                        });

                        const dateLabels = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));
                        const userCounts = dateLabels.map(label => groupedData[label]);

                        // Define chartConfig for 'user' based on grouped data
                        chartConfig = {
                            type: 'bar', // Vertical bar chart
                            data: {
                                labels: dateLabels, // Use the simplified date labels
                                datasets: [{
                                    label: 'Unique User Logins',
                                    data: userCounts,
                                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false, // This helps to maintain the aspect ratio on different screen sizes
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        ticks: {
                                            autoSkip: true,
                                            maxRotation: 0, // Keep labels horizontal
                                            minRotation: 0,
                                            padding: 10
                                        }
                                    },
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            padding: 10
                                        }
                                    }
                                },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Unique User Logins Per Week'
                                    }
                                }
                            }
                        };
                        break;

                    case "userActivityOverTime":
                        const activityByDate = {};

                        // Group data by date and sum activity counts
                        value.forEach(d => {
                            if (d && d.date && d.date.value) {
                                const dateValue = d.date.value;
                                if (!activityByDate[dateValue]) {
                                    activityByDate[dateValue] = { total: 0, count: 0 };
                                }
                                activityByDate[dateValue].total += d.active_count;
                                activityByDate[dateValue].count += 1;
                            }
                        });

                        // Calculate average activity per date
                        let averageActivity = Object.keys(activityByDate).map(date => {
                            return {
                                date: new Date(date), // Convert to Date object
                                average: activityByDate[date].total / activityByDate[date].count
                            };
                        });

                        // Sort by date
                        averageActivity = averageActivity.sort((a, b) => a.date - b.date);

                        // Convert dates back to string for labels
                        averageActivity = averageActivity.map(d => ({
                            date: d.date.toISOString().split('T')[0],
                            average: d.average
                        }));

                        chartConfig = {
                            type: 'line',
                            data: {
                                labels: averageActivity.map(d => d.date),
                                datasets: [{
                                    label: 'Average User Activity',
                                    data: averageActivity.map(d => d.average),
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false, // Add this to maintain aspect ratio
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            padding: 10 // Add padding for the labels
                                        }
                                    },
                                    x: {
                                        beginAtZero: true,
                                        ticks: {
                                            autoSkip: true, // Enable auto-skip so it doesn't show all labels
                                            maxRotation: 45, // Angle to slant the labels if shown
                                            minRotation: 45,
                                            padding: 10 // Add padding for the labels
                                        }
                                    }
                                },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Average User Activity Over Time'
                                    }
                                }
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
            {hasError ? (
                <div>Error occurred while fetching data. Please try again later.</div>
            ) : (
                Object.keys(chartRefs.current).map((key) => (
                    data[key] && data[key].length > 0 && (
                        <div key={key} className="chart-container">
                            <canvas ref={chartRefs.current[key]}></canvas>
                        </div>
                    )
                ))
            )}
        </div>
    );
}
export default App;
