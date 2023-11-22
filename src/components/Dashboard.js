import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import './style/Dashboard.css';


function App() {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const chartRefs = useRef({
        userActivityOverTime: React.createRef(),
        geo: React.createRef(),
        userEngagement: React.createRef(),
        technology: React.createRef(),
        acquisition: React.createRef(),
        user: React.createRef(),
        behaviorFlow: React.createRef()       
    });

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
                            },
                            options: {
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Traffic Source and Medium'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `Source/Medium: ${context.label} - Count: ${context.raw}`
                                        }
                                    }
                                }
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
                            },
                            options: {
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
                            }
                        };
                        break;


                    case "user":
                        // Assuming 'value' contains the array of user data
                        const userData = Array.isArray(value) ? value : [];

                        // Extract signup days and user counts from the data
                        const signupDays = userData.map(item => item.signup_day?.value ?? 'Invalid Date');
                        const uniqueUserCounts = userData.map(item => item.unique_user_count ?? 0);

                        // Define chartConfig for 'user' based on extracted data
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: signupDays,
                                datasets: [{
                                    label: 'Unique User Logins',
                                    data: uniqueUserCounts,
                                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Unique User Logins Per Day'
                                    }
                                }
                            }
                        };
                        break;



                    case "userActivityOverTime":
                        const activityByDate = {};

                        // Group data by date and sum activity counts
                        value.forEach(d => {
                            if (d && d.date && d.date.value) { // Adjusted to access d.date.value
                                const dateValue = d.date.value; // Extracting the date string
                                if (!activityByDate[dateValue]) {
                                    activityByDate[dateValue] = { total: 0, count: 0 };
                                }
                                activityByDate[dateValue].total += d.active_count;
                                activityByDate[dateValue].count += 1;
                            }
                        });

                        // Calculate average activity per date
                        const averageActivity = Object.keys(activityByDate).map(date => {
                            return {
                                date: date,
                                average: activityByDate[date].total / activityByDate[date].count
                            };
                        });

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
                                scales: {
                                    y: {
                                        beginAtZero: true
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
