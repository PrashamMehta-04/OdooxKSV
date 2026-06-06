import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { formatCurrency } from '../lib/format';
import type { SpendTrendPoint } from '../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function TrendChart({ data, type = 'bar' }: { data: SpendTrendPoint[], type?: 'bar' | 'line' }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Spend',
        data: data.map(d => d.amount),
        backgroundColor: 'rgba(113, 75, 103, 0.8)', // Odoo Purple
        borderColor: '#714B67',
        borderWidth: 1,
        fill: true,
        tension: 0.4, // Smooth line if type='line'
      },
    ],
  };

  return (
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      {type === 'bar' ? <Bar options={options} data={chartData} /> : <Line options={options} data={chartData} />}
    </div>
  );
}
