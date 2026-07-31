
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function App() {
  const labels = [
  "7/1",
  "7/2",
  "7/3",
  "7/4",
  "7/5",
];

const monthlyPrices = [
  875000,
  868000,
  897000,
  899000,
  894000,
];

const data = {
  labels: labels,

  datasets: [
    {
      label: "24K 내가살때",
      data: monthlyPrices,
      borderColor: "#c8a03a",
      backgroundColor: "#c8a03a",
      borderWidth: 3,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 6,
    },
  ],
};

  const prices = monthlyPrices;

  const firstPrice = prices[0];
  const currentPrice = prices[prices.length - 1];

  const priceDifference = currentPrice - firstPrice;
  const changeRate = (priceDifference / firstPrice) * 100;

  const isUp = priceDifference > 0;
  const isDown = priceDifference < 0;
    
  
  

  const options = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: "index",
    intersect: false,
  },

  plugins: {
    legend: {
      display: false,
    },

    tooltip: {
      displayColors: false,

      callbacks: {
        title: function (items) {
          return items[0].label;
        },

        label: function (context) {
          return "24K 내가살때  " + context.raw.toLocaleString() + "원";
        },
      },
    },
  },

  scales: {
    y: {
      ticks: {
        callback: function (value) {
          return value.toLocaleString() + "원";
        },
      },

      grid: {
        color: "#eeeeee",
      },
    },

    x: {
      ticks: {
        autoSkip: true,
        maxTicksLimit: 10,
        maxRotation: 0,
     },

     grid: {
      display: false,
     },
   },
 },
};


  return (
  <div className="container">
    <h1>한국표준금거래소 은평점</h1>

    <div className="price-header">
      <div>
        <p className="price-label">24K 내가살때</p>

        <p className="current-price">
          {currentPrice.toLocaleString()}원
        </p>
      </div>

      <p
        className={`price-change ${
          isUp ? "up" : isDown ? "down" : "same"
        }`}
      >
        {isUp ? "▲" : isDown ? "▼" : "―"}{" "}
        {Math.abs(priceDifference).toLocaleString()}원
        {" "}
        ({changeRate > 0 ? "+" : ""}
        {changeRate.toFixed(2)}%)
      </p>
    </div>

    <div className="chart-container">
      <Line data={data} options={options} />
    </div>

    <p className="update-time">
      최종 업데이트: 2026년 7월 25일
    </p>
  </div>
);
}

export default App;
