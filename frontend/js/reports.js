// Reports and analytics JavaScript

let Chart;
const charts = {};

const reportsApi = {
    async getStats() {
        return await api.request('dashboard.php?action=stats');
    },

    async getChartData() {
        try {
            return await api.request('dashboard.php?action=charts');
        } catch (error) {
            return {
                bugs_over_time: [],
                resolution_times: []
            };
        }
    }
};

const reportsUI = {
    async waitForChartJs() {
        return new Promise((resolve) => {
            const checkChart = () => {
                if (typeof window.Chart !== 'undefined') {
                    Chart = window.Chart;
                    resolve();
                } else {
                    if (!document.querySelector('script[src*="chart.js"]')) {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
                        script.onload = () => {
                            Chart = window.Chart;
                            resolve();
                        };
                        script.onerror = () => {
                            console.error('Failed to load Chart.js');
                            ui.showError('Failed to load charting library');
                            resolve();
                        };
                        document.head.appendChild(script);
                    } else {
                        setTimeout(checkChart, 100);
                    }
                }
            };
            checkChart();
        });
    },

    createStatusChart(statusData) {
        const ctx = document.getElementById('statusChart');
        if (!ctx || !Chart) return;

        try {
            const labels = statusData.map(item => item.status);
            const data = statusData.map(item => parseInt(item.count || 0));
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280'];

            charts.statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create status chart:', error);
        }
    },

    createPriorityChart(priorityData) {
        const ctx = document.getElementById('priorityChart');
        if (!ctx || !Chart) return;

        try {
            const labels = priorityData.map(item => item.priority);
            const data = priorityData.map(item => parseInt(item.count || 0));
            const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

            charts.priorityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Bugs',
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create priority chart:', error);
        }
    },

    createBugsOverTimeChart(timeData) {
        const ctx = document.getElementById('bugsOverTimeChart');
        if (!ctx || !Chart) return;

        try {
            const labels = timeData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const data = timeData.map(item => parseInt(item.count || 0));

            charts.bugsOverTimeChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Bugs Created',
                        data: data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create bugs over time chart:', error);
        }
    },

    createResolutionChart(resolutionData) {
        const ctx = document.getElementById('resolutionChart');
        if (!ctx || !Chart) return;

        try {
            const labels = resolutionData.map(item => item.priority);
            const data = resolutionData.map(item => parseFloat(item.avg_resolution_days || 0).toFixed(1));
            const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

            charts.resolutionChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Average Days to Resolve',
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Days'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create resolution chart:', error);
        }
    },

    showDataTables(statsResponse, chartsResponse) {
        console.log('Showing data tables as fallback');
        
        const containers = [
            { id: 'statusChart', data: statsResponse.status_counts, title: 'Bug Status Distribution', columns: ['Status', 'Count'] },
            { id: 'priorityChart', data: statsResponse.priority_counts, title: 'Bug Priority Distribution', columns: ['Priority', 'Count'] },
            { id: 'bugsOverTimeChart', data: chartsResponse.bugs_over_time, title: 'Bugs Created Over Time', columns: ['Date', 'Bugs Created'] },
            { id: 'resolutionChart', data: chartsResponse.resolution_times, title: 'Average Resolution Time by Priority', columns: ['Priority', 'Avg Days to Resolve'] }
        ];

        containers.forEach(({ id, data, title, columns }) => {
            const container = document.getElementById(id);
            if (container && data) {
                container.innerHTML = `
                    <div class="data-table-fallback">
                        <h4>${title}</h4>
                        <table class="table">
                            <thead>
                                <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                ${data.map(item => {
                                    const values = Object.values(item);
                                    return `<tr>${values.map(val => `<td>${val}</td>`).join('')}</tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });
    }
};

const reports = {
    async init() {
        console.log('Reports page loading...');
        
        const user = await auth.check();
        if (!user) return;

        await reportsUI.waitForChartJs();
        await this.loadChartData();
    },

    async loadChartData() {
        try {
            console.log('Loading chart data...');
            
            const [statsResponse, chartsResponse] = await Promise.all([
                reportsApi.getStats(),
                reportsApi.getChartData()
            ]);

            console.log('Chart data loaded:', { statsResponse, chartsResponse });

            if (Chart) {
                reportsUI.createStatusChart(statsResponse.status_counts || []);
                reportsUI.createPriorityChart(statsResponse.priority_counts || []);
                reportsUI.createBugsOverTimeChart(chartsResponse.bugs_over_time || []);
                reportsUI.createResolutionChart(chartsResponse.resolution_times || []);
            } else {
                console.warn('Chart.js not available, showing data tables instead');
                reportsUI.showDataTables(statsResponse, chartsResponse);
            }
        } catch (error) {
            console.error('Failed to load chart data:', error);
            ui.showError('Failed to load reports data: ' + error.message);
        }
    },

    exportChartData(chartType) {
        const chart = charts[chartType];
        if (!chart) {
            ui.showError('Chart not available for export');
            return;
        }

        try {
            const data = chart.data;
            let csvContent = "data:text/csv;charset=utf-8,";

            csvContent += "Label,Value\n";

            data.labels.forEach((label, index) => {
                const value = data.datasets[0].data[index];
                csvContent += `"${label}",${value}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `${chartType}_data.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to export chart data:', error);
            ui.showError('Failed to export chart data');
        }
    },

    refresh() {
        Object.values(charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        
        Object.keys(charts).forEach(key => {
            delete charts[key];
        });
        
        this.loadChartData();
    }
};

// Initialize reports
document.addEventListener('DOMContentLoaded', () => {
    reports.init();
});

// Export chart data functionality
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('export-btn')) {
        const chartType = e.target.dataset.chart;
        if (chartType) {
            reports.exportChartData(chartType);
        }
    }
});

// Export functions for external use
window.refreshReports = reports.refresh.bind(reports);
window.exportChartData = reports.exportChartData.bind(reports);