import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "./App.css";

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

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);

  return result;
}

function parseSheetDate(dateText) {
  const numbers = dateText?.match(/\d+/g);

  if (!numbers || numbers.length < 3) {
    return null;
  }

  const [year, month, day] = numbers.map(Number);

  return new Date(year, month - 1, day);
}

function getTimeFraction(timeText) {
  if (!timeText) {
    return 0;
  }

  const numbers = timeText.match(/\d+/g);

  if (!numbers || numbers.length < 2) {
    return 0;
  }

  let [hour, minute] = numbers.map(Number);

  const isPM = timeText.includes("오후");
  const isAM = timeText.includes("오전");

  if (isPM && hour !== 12) {
    hour += 12;
  }

  if (isAM && hour === 12) {
    hour = 0;
  }

  const totalMinutes = hour * 60 + minute;

  return totalMinutes / (24 * 60);
}

function parseDateTime(dateText, timeText) {
  const date = parseSheetDate(dateText);

  if (!date) {
    return null;
  }

  const fraction = getTimeFraction(timeText);

  const totalMinutes = Math.round(
    fraction * 24 * 60
  );

  const hour = Math.floor(
    totalMinutes / 60
  );

  const minute =
    totalMinutes % 60;

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date;
}

function getDateKey(dateText) {
  const date =
    parseSheetDate(dateText);

  if (!date) {
    return "";
  }

  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      date.getDate()
    ).padStart(2, "0")
  );
}

function App() {
  const [rows, setRows] =
    useState([]);

  const [
    selectedType,
    setSelectedType,
  ] = useState("buy");

  const [loading, setLoading] =
    useState(true);

  // 금 매도가격 계산기
  const [
    goldWeight,
    setGoldWeight,
  ] = useState("");

  const [
    calculatorMode,
    setCalculatorMode,
  ] = useState("current");

  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpw1diEhZ_IB2_pqXyMWbEI6EWys0I_br41lcM0oMX3uaDDNYOLO3815IQmnNxI_a_oOVsQZVEuyYb/pub?gid=0&single=true&output=csv";

    fetch(csvUrl)
      .then((response) =>
        response.text()
      )
      .then((text) => {
        const lines =
          text
            .trim()
            .split(/\r?\n/);

        const parsed = lines
          .slice(1)
          .map((line) => {
            const [
              date,
              time,
              buy,
              sell,
            ] = parseCSVLine(
              line
            );

            return {
              date:
                date?.trim(),

              time:
                time?.trim(),

              buy: Number(
                buy
                  ?.replace(
                    /,/g,
                    ""
                  )
                  .trim()
              ),

              sell: Number(
                sell
                  ?.replace(
                    /,/g,
                    ""
                  )
                  .trim()
              ),
            };
          })
          .filter(
            (row) =>
              row.date &&
              row.time &&
              Number.isFinite(
                row.buy
              ) &&
              Number.isFinite(
                row.sell
              )
          );

        setRows(parsed);
        setLoading(false);
      })
      .catch((error) => {
        console.error(
          "시세 데이터를 불러오지 못했습니다.",
          error
        );

        setLoading(false);
      });
  }, []);

  // 날짜 + 시간순 정렬
  const sortedRows =
    [...rows].sort(
      (a, b) =>
        parseDateTime(
          a.date,
          a.time
        ) -
        parseDateTime(
          b.date,
          b.time
        )
    );

  // 최근 한 달
  const today =
    new Date();

  const oneMonthAgo =
    new Date(today);

  oneMonthAgo.setMonth(
    oneMonthAgo.getMonth() - 1
  );

  const recentRows =
    sortedRows.filter(
      (row) => {
        const dateTime =
          parseDateTime(
            row.date,
            row.time
          );

        if (!dateTime) {
          return false;
        }

        return (
          dateTime >=
            oneMonthAgo &&
          dateTime <= today
        );
      }
    );

  const uniqueDates = [
    ...new Set(
      recentRows.map(
        (row) =>
          getDateKey(
            row.date
          )
      )
    ),
  ];

  // 날짜 간격은 동일하게,
  // 같은 날짜의 시세는 시간에 따라 배치
  const chartPoints =
    recentRows.map(
      (row) => {
        const dateKey =
          getDateKey(
            row.date
          );

        const dayIndex =
          uniqueDates.indexOf(
            dateKey
          );

        const timeFraction =
          getTimeFraction(
            row.time
          );

        return {
          x:
            dayIndex +
            timeFraction,

          y:
            selectedType ===
            "buy"
              ? row.buy
              : row.sell,
        };
      }
    );

  const data = {
    datasets: [
      {
        label:
          selectedType ===
          "buy"
            ? "24K 내가살때"
            : "24K 내가팔때",

        data:
          chartPoints,

        borderColor:
          "#111111",

        backgroundColor:
          "#111111",

        borderWidth: 3,

        tension: 0.3,

        pointRadius: 2,

        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,

    maintainAspectRatio:
      false,

    interaction: {
      mode: "nearest",
      intersect: false,
    },

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        displayColors:
          false,

        callbacks: {
          title: function (
            items
          ) {
            const index =
              items[0]
                .dataIndex;

            const row =
              recentRows[
                index
              ];

            const date =
              parseSheetDate(
                row.date
              );

            return `${date.getMonth() + 1}/${date.getDate()} ${row.time}`;
          },

          label: function (
            context
          ) {
            const name =
              selectedType ===
              "buy"
                ? "24K 내가살때"
                : "24K 내가팔때";

            return (
              name +
              "  " +
              context.raw.y.toLocaleString() +
              "원"
            );
          },
        },
      },
    },

    scales: {
      y: {
        ticks: {
          callback:
            function (
              value
            ) {
              return (
                value.toLocaleString() +
                "원"
              );
            },
        },

        grid: {
          color:
            "#eeeeee",
        },
      },

      x: {
        type: "linear",

        min: 0,

        max: Math.max(
          uniqueDates.length,
          1
        ),

        ticks: {
          stepSize: 1,

          maxRotation: 0,

          callback:
            function (
              value
            ) {
              const index =
                Math.round(
                  value
                );

              const dateKey =
                uniqueDates[
                  index
                ];

              if (
                !dateKey
              ) {
                return "";
              }

              const [
                ,
                month,
                day,
              ] =
                dateKey
                  .split(
                    "-"
                  )
                  .map(
                    Number
                  );

              return `${month}/${day}`;
            },
        },

        grid: {
          display:
            false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="container">
        시세를 불러오는 중입니다...
      </div>
    );
  }

  if (
    recentRows.length === 0
  ) {
    return (
      <div className="container">
        구글 시트에서 시세 데이터를 찾지 못했습니다.
      </div>
    );
  }

  // ----------------
  // 최신 시세
  // ----------------

  const latestRow =
    recentRows[
      recentRows.length - 1
    ];

  const latestDateKey =
    getDateKey(
      latestRow.date
    );

  const currentPrice =
    selectedType ===
    "buy"
      ? latestRow.buy
      : latestRow.sell;

  // ----------------
  // 전일 마지막 시세
  // ----------------

  const previousDates =
    uniqueDates.filter(
      (dateKey) =>
        dateKey !==
        latestDateKey
    );

  const previousDateKey =
    previousDates[
      previousDates.length - 1
    ];

  const previousDayRows =
    recentRows.filter(
      (row) =>
        getDateKey(
          row.date
        ) ===
        previousDateKey
    );

  const previousLastRow =
    previousDayRows[
      previousDayRows.length -
        1
    ];

  const previousPrice =
    previousLastRow
      ? selectedType ===
        "buy"
        ? previousLastRow.buy
        : previousLastRow.sell
      : currentPrice;

  const priceDifference =
    currentPrice -
    previousPrice;

  const changeRate =
    previousPrice !== 0
      ? (priceDifference /
          previousPrice) *
        100
      : 0;

  const isUp =
    priceDifference > 0;

  const isDown =
    priceDifference < 0;

  // ----------------
  // 최종 업데이트
  // ----------------

  const latestDate =
    parseSheetDate(
      latestRow.date
    );

  const latestDateText =
    `${latestDate.getFullYear()}.` +
    `${String(
      latestDate.getMonth() +
        1
    ).padStart(2, "0")}.` +
    `${String(
      latestDate.getDate()
    ).padStart(2, "0")}`;

  // ----------------
  // 금 매도가격 계산기
  // ----------------

  // 계산기는 항상 내가팔때 기준
  const currentSellPrice =
    latestRow.sell;

  // 현재 시세 바로 직전 입력값
  const previousRecordedRow =
    sortedRows.length >= 2
      ? sortedRows[
          sortedRows.length -
            2
        ]
      : latestRow;

  const previousSellPrice =
    previousRecordedRow.sell;

  const weight =
    Number(goldWeight);

  const hasWeight =
    Number.isFinite(weight) &&
    weight > 0;

  const currentGoldValue =
    hasWeight
      ? Math.round(
          (currentSellPrice *
            weight) /
            3.75
        )
      : 0;

  const previousGoldValue =
    hasWeight
      ? Math.round(
          (previousSellPrice *
            weight) /
            3.75
        )
      : 0;

  const calculatorValue =
    calculatorMode ===
    "current"
      ? currentGoldValue
      : previousGoldValue;

  const goldDifference =
    currentGoldValue -
    previousGoldValue;

  return (
    <div className="container">
      <h1>
        한국표준금거래소 은평점
      </h1>

      <div className="type-buttons">
        <button
          className={
            selectedType ===
            "buy"
              ? "active"
              : ""
          }
          onClick={() =>
            setSelectedType(
              "buy"
            )
          }
        >
          내가살때
        </button>

        <button
          className={
            selectedType ===
            "sell"
              ? "active"
              : ""
          }
          onClick={() =>
            setSelectedType(
              "sell"
            )
          }
        >
          내가팔때
        </button>
      </div>

      <div className="price-header">
        <div>
          <p className="price-label">
            {selectedType ===
            "buy"
              ? "24K 내가살때"
              : "24K 내가팔때"}
          </p>

          <p className="current-price">
            {currentPrice.toLocaleString()}
            원
          </p>
        </div>

        <div>
          <p className="price-label">
            전일 대비
          </p>

          <p
            className={`price-change ${
              isUp
                ? "up"
                : isDown
                  ? "down"
                  : "same"
            }`}
          >
            {isUp
              ? "▲"
              : isDown
                ? "▼"
                : "―"}{" "}
            {Math.abs(
              priceDifference
            ).toLocaleString()}
            원{" "}
            (
            {changeRate >
            0
              ? "+"
              : ""}
            {changeRate.toFixed(
              2
            )}
            %)
          </p>
        </div>
      </div>

      <div className="chart-container">
        <Line
          data={data}
          options={options}
        />
      </div>

      <p className="update-time">
        최종 업데이트:{" "}
        {latestDateText}{" "}
        {latestRow.time}
      </p>

      {/* 금 매도가격 계산기 */}

      <div className="gold-calculator">
        <h2>
          금 매도가격 계산기
        </h2>

        <p className="calculator-description">
          24K 골드바 기준
        </p>

        <div className="weight-input-row">
          <label htmlFor="goldWeight">
            중량
          </label>

          <div className="weight-input-wrap">
            <input
              id="goldWeight"
              type="number"
              min="0"
              step="0.01"
              placeholder="예: 10"
              value={
                goldWeight
              }
              onChange={(
                event
              ) =>
                setGoldWeight(
                  event.target
                    .value
                )
              }
            />

            <span>
              g
            </span>
          </div>
        </div>

        <div className="quick-weight-buttons">
          <button onClick={() => setGoldWeight("3.75")}>
            <span className="weight-gram">3.75g</span>
            <span className="weight-don">1돈</span>
          </button>

          <button onClick={() => setGoldWeight("7.5")}>
            <span className="weight-gram">7.5g</span>
            <span className="weight-don">2돈</span>
          </button>

          <button onClick={() => setGoldWeight("11.25")}>
            <span className="weight-gram">11.25g</span>
            <span className="weight-don">3돈</span>
          </button>

          <button onClick={() => setGoldWeight("37.5")}>
            <span className="weight-gram">37.5g</span>
            <span className="weight-don">10돈</span>
          </button>
        </div>

        <div className="calculator-buttons">
          <button
            className={
              calculatorMode ===
              "current"
                ? "active"
                : ""
            }
            onClick={() =>
              setCalculatorMode(
                "current"
              )
            }
          >
            현재시세
          </button>

          <button
            className={
              calculatorMode ===
              "previous"
                ? "active"
                : ""
            }
            onClick={() =>
              setCalculatorMode(
                "previous"
              )
            }
          >
            직전시세
          </button>
        </div>

        {hasWeight ? (
          <>
            <p className="calculator-price-label">
              {calculatorMode ===
              "current"
                ? "현재시세 기준"
                : "직전시세 기준"}
            </p>

            <p className="calculator-result">
              {calculatorValue.toLocaleString()}
              원
            </p>

            <p
              className={`calculator-difference ${
                goldDifference >
                0
                  ? "up"
                  : goldDifference <
                      0
                    ? "down"
                    : "same"
              }`}
            >
              {calculatorMode ===
              "current"
                ? "직전시세 기준 "
                : "현재시세 기준 "}

              {calculatorMode ===
              "current"
                ? goldDifference >=
                  0
                  ? "+"
                  : "-"
                : goldDifference <=
                    0
                  ? "+"
                  : "-"}

              {Math.abs(
                goldDifference
              ).toLocaleString()}
              원입니다.
            </p>
          </>
        ) : (
          <p className="calculator-empty">
            중량을 입력해주세요.
          </p>
        )}

        <p className="calculator-notice">
          * 골드바 기준 가격입니다.
        </p>
      </div>
    </div>
  );
}

export default App;