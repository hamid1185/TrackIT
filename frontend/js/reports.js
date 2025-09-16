// Reports and analytics JavaScript

// Use the API base from main.js if available, otherwise set default
const API_BASE = window.API_BASE || '/bugsagev3/backend/api/';

// Chart.js will be loaded from CDN, so we'll check if it's available
let Chart;

// Use utils and checkAuth from main.js if available
const utils = window.utils || {
  apiRequest: async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;
    const response = await fetch(fullUrl, {
      credentials: 'same-origin',
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  },
  
  showError: (message) => {
    console.error('Error:', message);
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }
};

const checkAuth = window.checkAuth || (async () => {
  try {
    const response = await utils.apiRequest('auth.php?action=check');
    if (response.authenticated) {
      return response.user;
    }
    window.location.href = 'login.html';
    return null;
  } catch (error) {
    window.location.href = 'login.html';
    return null;
  }
});

const charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Reports page loading...');
  
  // Check authentication
  const user = await checkAuth();
  if (!user) return;

  // Update user name
  const userNameElement = document.getElementById('user-name');
  if (userNameElement) {
    userNameElement.textContent = user.name;
  }

  // Wait for Chart.js to load
  await waitForChartJs();

  // Load chart data and create charts
  await loadChartData();
});

async function waitForChartJs() {
  // Check if Chart.js is loaded from CDN
  return new Promise((resolve) => {
    const checkChart = () => {
      if (typeof window.Chart !== 'undefined') {
        Chart = window.Chart;
        resolve();
      } else {
        // If Chart.js is not loaded, load it dynamically
        if (!document.querySelector('script[src*="chart.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
          script.onload = () => {
            Chart = window.Chart;
            resolve();
          };
          script.onerror = () => {
            console.error('Failed to load Chart.js');
            utils.showError('Failed to load charting library');
            resolve(); // Resolve anyway to continue execution
          };
          document.head.appendChild(script);
        } else {
          setTimeout(checkChart, 100);
        }
      }
    };
    checkChart();
  });
}

async function loadChartData() {
  try {
    console.log('Loading chart data...');
    
    const [statsResponse, chartsResponse] = await Promise.all([
      utils.apiRequest('dashboard.php?action=stats'),
      utils.apiRequest('dashboard.php?action=charts').catch(() => ({
        bugs_over_time: [],
        resolution_times: []
      }))
    ]);

    console.log('Chart data loaded:', { statsResponse, chartsResponse });

    if (Chart) {
      createStatusChart(statsResponse.status_counts || []);
      createPriorityChart(statsResponse.priority_counts || []);
      createBugsOverTimeChart(chartsResponse.bugs_over_time || []);
      createResolutionChart(chartsResponse.resolution_times || []);
    } else {
      console.warn('Chart.js not available, showing data tables instead');
      showDataTables(statsResponse, chartsResponse);
    }
  } catch (error) {
    console.error('Failed to load chart data:', error);
    utils.showError('Failed to load reports data: ' + error.message);
  }
}

function createStatusChart(statusData) {
  const ctx = document.getElementById('statusChart');
  if (!ctx || !Chart) return;

  try {
    const labels = statusData.map((item) => item.status);
    const data = statusData.map((item) => parseInt(item.count || 0));
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280'];

    charts.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
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
}

function createPriorityChart(priorityData) {
  const ctx = document.getElementById('priorityChart');
  if (!ctx || !Chart) return;

  try {
    const labels = priorityData.map((item) => item.priority);
    const data = priorityData.map((item) => parseInt(item.count || 0));
    const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

    charts.priorityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Number of Bugs',
            data: data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }
        ]
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
}

function createBugsOverTimeChart(timeData) {
  const ctx = document.getElementById('bugsOverTimeChart');
  if (!ctx || !Chart) return;

  try {
    const labels = timeData.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = timeData.map((item) => parseInt(item.count || 0));

    charts.bugsOverTimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Bugs Created',
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }
        ]
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
}

function createResolutionChart(resolutionData) {
  const ctx = document.getElementById('resolutionChart');
  if (!ctx || !Chart) return;

  try {
    const labels = resolutionData.map((item) => item.priority);
    const data = resolutionData.map((item) => parseFloat(item.avg_resolution_days || 0).toFixed(1));
    const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

    charts.resolutionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Days to Resolve',
            data: data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }
        ]
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
}

function showDataTables(statsResponse, chartsResponse) {
  // Fallback: Show data in tables if Chart.js is not available
  console.log('Showing data tables as fallback');
  
  // Status data table
  const statusContainer = document.getElementById('statusChart');
  if (statusContainer && statsResponse.status_counts) {
    statusContainer.innerHTML = `
      <div class="data-table-fallback">
        <h4>Bug Status Distribution</h4>
        <table class="table">
          <thead>
            <tr><th>Status</th><th>Count</th></tr>
          </thead>
          <tbody>
            ${statsResponse.status_counts.map(item => `
              <tr><td>${item.status}</td><td>${item.count}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Priority data table
  const priorityContainer = document.getElementById('priorityChart');
  if (priorityContainer && statsResponse.priority_counts) {
    priorityContainer.innerHTML = `
      <div class="data-table-fallback">
        <h4>Bug Priority Distribution</h4>
        <table class="table">
          <thead>
            <tr><th>Priority</th><th>Count</th></tr>
          </thead>
          <tbody>
            ${statsResponse.priority_counts.map(item => `
              <tr><td>${item.priority}</td><td>${item.count}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Bugs over time table
  const timeContainer = document.getElementById('bugsOverTimeChart');
  if (timeContainer && chartsResponse.bugs_over_time) {
    timeContainer.innerHTML = `
      <div class="data-table-fallback">
        <h4>Bugs Created Over Time</h4>
        <table class="table">
          <thead>
            <tr><th>Date</th><th>Bugs Created</th></tr>
          </thead>
          <tbody>
            ${chartsResponse.bugs_over_time.map(item => `
              <tr><td>${item.date}</td><td>${item.count}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Resolution time table
  const resolutionContainer = document.getElementById('resolutionChart');
  if (resolutionContainer && chartsResponse.resolution_times) {
    resolutionContainer.innerHTML = `
      <div class="data-table-fallback">
        <h4>Average Resolution Time by Priority</h4>
        <table class="table">
          <thead>
            <tr><th>Priority</th><th>Avg Days to Resolve</th></tr>
          </thead>
          <tbody>
            ${chartsResponse.resolution_times.map(item => `
              <tr><td>${item.priority}</td><td>${parseFloat(item.avg_resolution_days || 0).toFixed(1)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// Export chart data functionality
function exportChartData(chartType) {
  const chart = charts[chartType];
  if (!chart) {
    utils.showError('Chart not available for export');
    return;
  }

  try {
    const data = chart.data;
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add headers
    csvContent += "Label,Value\n";

    // Add data rows
    data.labels.forEach((label, index) => {
      const value = data.datasets[0].data[index];
      csvContent += `"${label}",${value}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${chartType}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export chart data:', error);
    utils.showError('Failed to export chart data');
  }
}

// Add export buttons functionality
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('export-btn')) {
    const chartType = e.target.dataset.chart;
    if (chartType) {
      exportChartData(chartType);
    }
  }
});

// Add refresh functionality
function refreshReports() {
  // Destroy existing charts
  Object.values(charts).forEach(chart => {
    if (chart && chart.destroy) {
      chart.destroy();
    }
  });
  
  // Clear charts object
  Object.keys(charts).forEach(key => {
    delete charts[key];
  });
  
  // Reload data
  loadChartData();
}

// Export functions for external use
window.refreshReports = refreshReports;
window.exportChartData = exportChartData;