const STORAGE_KEY = "autophagy-health-dashboard-v1";

const demoRecords = [
  {
    date: "2026-04-27",
    fastingHours: 10 + 4 / 60,
    energyBalance: -1259,
    intakeKcal: 38,
    burnKcal: 1297,
    bmrKcal: 787,
    activityKcal: 510,
    bodyFat: 21.7,
    muscleRate: 34,
    waterContent: 55.7,
    proteinShare: 16.3,
    proteinIntake: null,
    carbGrams: null,
    weightJin: 129.3,
  },
  {
    date: "2026-04-28",
    fastingHours: 10 + 51 / 60,
    energyBalance: -500,
    intakeKcal: 406,
    burnKcal: 906,
    bmrKcal: 727,
    activityKcal: 179,
    bodyFat: 21.6,
    muscleRate: 34,
    waterContent: 55.7,
    proteinShare: 36,
    proteinIntake: 28,
    carbGrams: 32,
    weightJin: 129.2,
  },
  {
    date: "2026-04-29",
    fastingHours: 16 + 17 / 60,
    energyBalance: -16,
    intakeKcal: 1396,
    burnKcal: 1412,
    bmrKcal: 1027,
    activityKcal: 385,
    bodyFat: 21.7,
    muscleRate: 34,
    waterContent: 55.6,
    proteinShare: 16.3,
    proteinIntake: null,
    carbGrams: null,
    weightJin: 129.4,
  },
  {
    date: "2026-05-02",
    fastingHours: 12 + 11 / 60,
    energyBalance: -533,
    intakeKcal: 642,
    burnKcal: 1175,
    bmrKcal: 970,
    activityKcal: 205,
    bodyFat: 21.4,
    muscleRate: 34.1,
    waterContent: 55.8,
    proteinShare: 26,
    proteinIntake: 35,
    carbGrams: 74,
    weightJin: 128.3,
  },
];

let records = loadRecords();
let uploadedFiles = [];

const el = {
  todayStage: document.querySelector("#todayStage"),
  todayDate: document.querySelector("#todayDate"),
  todayScore: document.querySelector("#todayScore"),
  fastingText: document.querySelector("#fastingText"),
  energyText: document.querySelector("#energyText"),
  avgScoreText: document.querySelector("#avgScoreText"),
  stageInsight: document.querySelector("#stageInsight"),
  fatNow: document.querySelector("#fatNow"),
  muscleNow: document.querySelector("#muscleNow"),
  proteinNow: document.querySelector("#proteinNow"),
  cellNow: document.querySelector("#cellNow"),
  fatNote: document.querySelector("#fatNote"),
  muscleNote: document.querySelector("#muscleNote"),
  proteinNote: document.querySelector("#proteinNote"),
  cellNote: document.querySelector("#cellNote"),
  autophagyAverage: document.querySelector("#autophagyAverage"),
  fatAverage: document.querySelector("#fatAverage"),
  cellAverage: document.querySelector("#cellAverage"),
  historyBody: document.querySelector("#historyBody"),
  entryForm: document.querySelector("#entryForm"),
  imageUpload: document.querySelector("#imageUpload"),
  previewStrip: document.querySelector("#previewStrip"),
  ocrButton: document.querySelector("#ocrButton"),
  ocrStatus: document.querySelector("#ocrStatus"),
  confidenceText: document.querySelector("#confidenceText"),
  formulaText: document.querySelector("#formulaText"),
  componentGrid: document.querySelector("#componentGrid"),
  derivedGrid: document.querySelector("#derivedGrid"),
  toggleHistory: document.querySelector("#toggleHistory"),
  historyContent: document.querySelector("#historyContent"),
};

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : structuredClone(demoRecords);
  } catch {
    return structuredClone(demoRecords);
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function sortedRecords() {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestRecord() {
  return sortedRecords().at(-1);
}

function lastSevenRecords() {
  const latest = getLatestRecord();
  if (!latest) return [];
  return recordsWindowEnding(latest.date);
}

function recordsWindowEnding(endDate) {
  if (!endDate) return [];
  const end = parseDate(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const recordMap = new Map(sortedRecords().map((record) => [record.date, record]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = toIsoDate(date);
    return recordMap.get(iso) || { date: iso, missing: true };
  });
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(value) {
  const date = parseDate(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFasting(hours) {
  if (!Number.isFinite(hours)) return "--";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}小时${minutes}分`;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(items, key) {
  const values = items.map((item) => item[key]).filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value, fullScale) {
  if (!isFiniteValue(value) || !Number.isFinite(fullScale) || fullScale <= 0) return null;
  return clamp(Number(value) / fullScale, 0, 1);
}

function componentValue(value, fallback = 0.35) {
  return Number.isFinite(value) ? value : fallback;
}

function calculateAutophagy(record, previousRecord = null) {
  const fasting = isFiniteValue(record.fastingHours) ? Number(record.fastingHours) : 0;
  const energyBalance = isFiniteValue(record.energyBalance) ? Number(record.energyBalance) : 0;
  const deficit = Math.max(0, -energyBalance);
  const intake = isFiniteValue(record.intakeKcal) ? Math.max(0, Number(record.intakeKcal)) : null;
  const bmr = estimateBmr(record);
  const activity = estimateActivity(record);
  const weightKg = estimateWeightKg(record);
  const carbs = isFiniteValue(record.carbGrams) ? Number(record.carbGrams) : null;
  const proteinPerKg = weightKg && isFiniteValue(record.proteinIntake) ? Number(record.proteinIntake) / weightKg : null;
  const trend = calculateTrendComponent(record, previousRecord);

  const fastingComponent = clamp((fasting - 10) / 12, 0, 1);
  const deficitComponent = normalize(deficit, bmr ? bmr * 0.65 : 1000);
  const carbComponent = carbs !== null ? clamp(1 - carbs / 130, 0, 1) : intake !== null ? clamp(1 - intake / 1200, 0, 1) : null;
  const activityComponent = normalize(activity, bmr ? bmr * 0.35 : 500);
  const proteinComponent = proteinPerKg !== null ? clamp(1 - proteinPerKg / 1.2, 0, 1) : null;

  const components = {
    fasting: { label: "空腹窗口", weight: 45, value: fastingComponent, detail: formatFasting(fasting) },
    deficit: { label: "能量压力", weight: 20, value: componentValue(deficitComponent), detail: `${deficit} 千卡缺口` },
    carb: {
      label: "低碳水/低摄入",
      weight: 12,
      value: componentValue(carbComponent),
      detail: carbs !== null ? `${carbs}g 碳水` : intake !== null ? `${intake} 千卡摄入` : "营养数据缺失",
    },
    activity: { label: "活动燃烧", weight: 10, value: componentValue(activityComponent), detail: `${round(activity, 0) ?? "--"} 千卡活动` },
    protein: {
      label: "氨基酸信号",
      weight: 8,
      value: componentValue(proteinComponent),
      detail: proteinPerKg !== null ? `${round(proteinPerKg, 2)}g/kg 蛋白` : "蛋白数据缺失",
    },
    trend: { label: "体成分趋势", weight: 5, value: componentValue(trend), detail: previousRecord ? "对比上一条记录" : "等待更多记录" },
  };

  const rawScore = Object.values(components).reduce((sum, item) => sum + item.weight * item.value, 0);
  const score = Math.round(clamp(rawScore, 0, 100));
  const confidence = calculateConfidence(record);

  let stage = "基础";
  let tone = "当前更像普通代谢期";
  if (score >= 78) {
    stage = "重度";
    tone = "空腹、能量压力和营养信号共同指向较高的细胞清理代理信号";
  } else if (score >= 55) {
    stage = "中度";
    tone = "空腹窗口与能量压力已经进入较明显阶段，脂肪利用和细胞清理代理信号升高";
  } else if (score >= 30) {
    stage = "轻度";
    tone = "已出现温和的能量动员，细胞自噬代理信号处于早期到轻度区间";
  }

  return { score, stage, tone, components, confidence };
}

function estimateBmr(record) {
  if (isFiniteValue(record.bmrKcal)) return Math.abs(Number(record.bmrKcal));
  if (isFiniteValue(record.burnKcal)) return Math.abs(Number(record.burnKcal)) * 0.78;
  return 1500;
}

function estimateActivity(record) {
  if (isFiniteValue(record.activityKcal)) return Math.abs(Number(record.activityKcal));
  if (isFiniteValue(record.burnKcal) && isFiniteValue(record.bmrKcal)) return Math.max(0, Math.abs(Number(record.burnKcal)) - Math.abs(Number(record.bmrKcal)));
  if (isFiniteValue(record.burnKcal)) return Math.abs(Number(record.burnKcal)) * 0.18;
  return 0;
}

function estimateWeightKg(record) {
  return isFiniteValue(record.weightJin) ? Number(record.weightJin) * 0.5 : null;
}

function calculateTrendComponent(record, previousRecord) {
  if (!previousRecord) return null;
  const fatTrend = isFiniteValue(record.bodyFat) && isFiniteValue(previousRecord.bodyFat) ? clamp((Number(previousRecord.bodyFat) - Number(record.bodyFat)) / 0.8, 0, 1) : null;
  const weightTrend =
    isFiniteValue(record.weightJin) && isFiniteValue(previousRecord.weightJin) ? clamp((Number(previousRecord.weightJin) - Number(record.weightJin)) / 2, 0, 1) : null;
  const values = [fatTrend, weightTrend].filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateConfidence(record) {
  const fields = ["fastingHours", "energyBalance", "bmrKcal", "activityKcal", "intakeKcal", "carbGrams", "proteinIntake", "weightJin", "bodyFat", "muscleRate"];
  const present = fields.filter((field) => isFiniteValue(record[field])).length;
  return Math.round((present / fields.length) * 100);
}

function hasAutophagyInputs(record) {
  return isFiniteValue(record.fastingHours) && isFiniteValue(record.energyBalance);
}

function isFiniteValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function render() {
  records = sortedRecords();
  saveRecords();

  const latest = getLatestRecord();
  const seven = lastSevenRecords();
  if (!latest) return;

  const previous = records.at(-2);
  const latestAuto = calculateAutophagy(latest, previous);
  const previousAuto = previous ? calculateAutophagy(previous, previousRecordFor(previous)) : null;
  const autoValues = seven.map((record) => ({
    ...record,
    autophagyScore: hasAutophagyInputs(record) ? calculateAutophagy(record, previousRecordFor(record)).score : null,
  }));
  const autophagyAvg = average(autoValues, "autophagyScore");

  el.todayDate.textContent = latest.date;
  el.todayStage.textContent = latestAuto.stage;
  el.todayScore.textContent = latestAuto.score;
  el.fastingText.textContent = formatFasting(Number(latest.fastingHours));
  el.energyText.textContent = `${Number(latest.energyBalance) > 0 ? "+" : ""}${latest.energyBalance ?? "--"} 千卡`;
  el.avgScoreText.textContent = autophagyAvg === null ? "--" : `${round(autophagyAvg, 0)} 分`;
  el.stageInsight.textContent = `${latestAuto.tone}。本次估算主要来自 ${formatFasting(Number(latest.fastingHours))} 的空腹窗口、${latest.energyBalance} 千卡能量平衡，以及 ${latest.proteinIntake ?? "未录入"}g 蛋白质摄入。`;

  el.fatNow.textContent = valueText(latest.bodyFat, "%");
  el.muscleNow.textContent = valueText(latest.muscleRate, "%");
  el.proteinNow.textContent = valueText(latest.proteinIntake, "g");
  el.cellNow.textContent = latestAuto.stage;
  el.fatNote.textContent = diffText(latest.bodyFat, previous?.bodyFat, "%", "体脂");
  el.muscleNote.textContent = diffText(latest.muscleRate, previous?.muscleRate, "%", "肌肉率");
  el.proteinNote.textContent = latest.proteinShare ? `占摄入约 ${latest.proteinShare}%` : "等待营养截图补录";
  el.cellNote.textContent = latestAuto.score >= 52 ? "细胞清理信号更活跃" : "脂肪动员温和上升";
  el.confidenceText.textContent = `数据完整度 ${latestAuto.confidence}%`;
  el.formulaText.textContent =
    "ASI = clamp(0,100, 45F + 20D + 12C + 10A + 8P + 5T)。F=空腹窗口，D=能量缺口/BMR，C=低碳水或低摄入，A=活动燃烧/BMR，P=蛋白质g/kg的mTOR刹车反向分，T=体脂/体重短期下降趋势。";
  renderComponents(latestAuto.components, previousAuto?.components);
  renderDerivedMetrics(latest, previous, seven);

  el.autophagyAverage.textContent = statText("均值", autophagyAvg, "分", 0);
  el.fatAverage.textContent = statText("均值", average(seven, "bodyFat"), "%");
  el.cellAverage.textContent = statText("均值", autophagyAvg, "分", 0);

  drawGauge(document.querySelector("#gaugeCanvas"), latestAuto.score);
  drawLineChart(document.querySelector("#autophagyChart"), autoValues, "autophagyScore", {
    color: "#27d7e8",
    fill: "rgba(39, 215, 232, 0.13)",
    suffix: "分",
    min: 0,
    max: 100,
  });
  drawLineChart(document.querySelector("#fatChart"), seven, "bodyFat", {
    color: "#ff4fac",
    fill: "rgba(255, 79, 172, 0.12)",
    suffix: "%",
  });
  drawLineChart(document.querySelector("#cellChart"), autoValues, "autophagyScore", {
    color: "#8d6cff",
    fill: "rgba(141, 108, 255, 0.13)",
    suffix: "分",
    min: 0,
    max: 100,
  });

  renderHistory();
  prefillForm(latest);
}

function previousRecordFor(record) {
  const index = records.findIndex((item) => item.date === record.date);
  return index > 0 ? records[index - 1] : null;
}

function renderComponents(components, previousComponents = null) {
  el.componentGrid.innerHTML = Object.entries(components)
    .map(([key, component]) => {
      const contribution = round(component.weight * component.value, 1);
      const previousContribution = previousComponents?.[key] ? round(previousComponents[key].weight * previousComponents[key].value, 1) : null;
      const arrow = contributionArrow(contribution, previousContribution);
      const previousText = previousContribution === null ? "上条 --" : `上条 ${previousContribution}分 ${arrow}`;
      return `<article class="component-card">
        <span>${component.label} · 权重 ${component.weight}</span>
        <strong>${contribution} 分</strong>
        <small>${component.detail} · ${previousText}</small>
      </article>`;
    })
    .join("");
}

function contributionArrow(current, previous) {
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return "";
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return "→";
  return diff > 0 ? "↑" : "↓";
}

function trendPhrase(change, suffix = "") {
  if (change === null || change === undefined || !Number.isFinite(change)) return "新增数据后暂无上一条可比记录";
  if (Math.abs(change) < 0.1) return "较上一条几乎持平";
  return `较上一条${change > 0 ? "上升" : "下降"} ${Math.abs(change)}${suffix}`;
}

function changeMeaning(change, upText, downText, flatText) {
  if (change === null || change === undefined || !Number.isFinite(change) || Math.abs(change) < 0.1) return flatText;
  return change > 0 ? upText : downText;
}

function renderDerivedMetrics(latest, previous, seven) {
  const previousSeven = previous ? recordsWindowEnding(previous.date) : [];
  const derived = calculateDerivedMetrics(latest, seven, previous, previousSeven);
  el.derivedGrid.innerHTML = derived
    .map(
      (item) => `<article class="derived-card">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
        <small>${item.note}</small>
        <canvas class="derived-mini-chart" data-key="${item.key}" height="72" aria-label="${item.label}过去七天曲线"></canvas>
      </article>`,
    )
    .join("");
  el.derivedGrid.querySelectorAll(".derived-mini-chart").forEach((canvas) => {
    drawMiniLineChart(canvas, derivedSeries(canvas.dataset.key), "#27d7e8");
  });
}

function calculateDerivedMetrics(record, seven, previous = null, previousSeven = []) {
  const raw = deriveBodyState(record, seven);
  const previousRaw = previous ? deriveBodyState(previous, previousSeven) : null;

  return [
    {
      key: "energyAvailability",
      label: "能量可用性",
      value: raw.energyAvailability === null ? "--" : `${round(raw.energyAvailability, 1)} kcal/kg`,
      note: "净摄入按体重折算后的热量余量，用来观察热量限制是否集中到每公斤体重上。",
    },
    {
      key: "intakeCoverage",
      label: "摄入覆盖率",
      value: raw.intakeCoverage === null ? "--" : `${round(raw.intakeCoverage * 100, 0)}%`,
      note: "摄入热量占当日总燃烧的比例，用来判断当天更接近热量限制还是补能状态。",
    },
    {
      key: "fastingMax",
      label: "最长空腹",
      value: raw.fastingMax === null ? "--" : formatFasting(raw.fastingMax),
      note: "最近七天内最高的空腹窗口，用来观察空腹压力的上限。",
    },
    {
      key: "proteinEnergyShare",
      label: "蛋白热量占比",
      value: raw.proteinEnergyShare === null ? "--" : `${round(raw.proteinEnergyShare * 100, 0)}%`,
      note: "蛋白质热量在总摄入中的占比，用来观察氨基酸营养信号的相对强度。",
    },
    {
      key: "carbProteinRatio",
      label: "碳蛋比",
      value: raw.carbProteinRatio === null ? "--" : `${round(raw.carbProteinRatio, 2)} : 1`,
      note: "碳水克数和蛋白质克数的比例，用来观察摄入结构偏向碳水还是蛋白。",
    },
    {
      key: "carbPerKg",
      label: "碳水密度",
      value: raw.carbPerKg === null ? "--" : `${round(raw.carbPerKg, 2)} g/kg`,
      note: "碳水摄入按体重折算后的密度，用来观察营养压力是否来自低碳水。",
    },
  ];
}

function deriveBodyState(record, seven) {
  const weightKg = estimateWeightKg(record);
  const intake = isFiniteValue(record.intakeKcal) ? Number(record.intakeKcal) : null;
  const burn = isFiniteValue(record.burnKcal) ? Math.abs(Number(record.burnKcal)) : null;
  const activity = estimateActivity(record);
  const netAfterActivity = intake !== null ? intake - activity : null;
  const energyAvailability = weightKg && netAfterActivity !== null ? netAfterActivity / weightKg : null;
  const intakeCoverage = intake !== null && burn ? intake / burn : null;
  const proteinEnergyShare = intake && isFiniteValue(record.proteinIntake) ? (Number(record.proteinIntake) * 4) / intake : null;
  const carbProteinRatio = isFiniteValue(record.carbGrams) && isFiniteValue(record.proteinIntake) && Number(record.proteinIntake) > 0 ? Number(record.carbGrams) / Number(record.proteinIntake) : null;
  const carbPerKg = weightKg && isFiniteValue(record.carbGrams) ? Number(record.carbGrams) / weightKg : null;
  const validSeven = seven.filter((item) => !item.missing);
  const fastingValues = validSeven.map((item) => (isFiniteValue(item.fastingHours) ? Number(item.fastingHours) : null)).filter(Number.isFinite);
  const fastingAverage = fastingValues.length ? fastingValues.reduce((sum, value) => sum + value, 0) / fastingValues.length : null;
  const fastingMax = fastingValues.length ? Math.max(...fastingValues) : null;
  const netPressure = burn !== null && intake !== null ? burn - intake : null;
  return { netAfterActivity, energyAvailability, intakeCoverage, fastingAverage, fastingMax, netPressure, proteinEnergyShare, carbProteinRatio, carbPerKg };
}

function derivedSeries(key) {
  return lastSevenRecords().map((record) => {
    if (record.missing) return { date: record.date, value: null };
      const value = deriveBodyState(record, recordsWindowEnding(record.date))[key];
      return { date: record.date, value };
  });
}

function drawMiniLineChart(canvas, series, color) {
  const { ctx, width, height } = setupCanvas(canvas, 72);
  const values = series.map((item) => (isFiniteValue(item.value) ? Number(item.value) : null));
  const valid = values.filter(Number.isFinite);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 14);
  ctx.lineTo(width, height - 14);
  ctx.stroke();

  if (!valid.length) {
    ctx.fillStyle = "rgba(244,248,255,0.45)";
    ctx.font = "12px system-ui";
    ctx.fillText("暂无七日数据", 4, height / 2);
    return;
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = series.length === 1 ? width / 2 : (width / (series.length - 1)) * index;
    const y = value === null ? null : 10 + (height - 28) - ((value - min) / range) * (height - 28);
    return { x, y, value };
  });
  const drawable = points.filter((point) => Number.isFinite(point.y));
  if (!drawable.length) return;

  ctx.beginPath();
  traceSmoothPath(ctx, drawable);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawable.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1019";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function derivedNote(current, previous, suffix, interpretation, higherIsMore = true, multiplier = 1) {
  if (!isFiniteValue(current)) return "这项需要更多当日数据才能分析。新增截图识别到相关字段后，这里会自动改写为当天和上一条记录的对比说明。";
  const currentValue = Number(current) * multiplier;
  const previousValue = isFiniteValue(previous) ? Number(previous) * multiplier : null;
  if (previousValue === null) return `这是新增记录后的当前基准值。${firstSentence(interpretation)}`;
  const diff = round(currentValue - previousValue, suffix === "%" ? 0 : 1);
  const direction = Math.abs(diff) < 0.1 ? "基本持平" : diff > 0 ? "上升" : "下降";
  const amount = Math.abs(diff) < 0.1 ? "" : ` ${Math.abs(diff)}${suffix}`;
  const pressure = Math.abs(diff) < 0.1 ? "整体状态延续上一条记录" : diff > 0 === higherIsMore ? "该变化让这个指标的压力解释更强" : "该变化让这个指标的压力解释减弱";
  return `新增这一天后，较上一条${direction}${amount}，${pressure}。${firstSentence(interpretation)}`;
}

function firstSentence(text) {
  return String(text).split(/[。.!?]/).filter(Boolean)[0] + "。";
}

function valueText(value, suffix, digits = 1) {
  return isFiniteValue(value) ? `${round(Number(value), digits)}${suffix}` : "--";
}

function statText(label, value, suffix, digits = 1) {
  return value === null ? `${label} --` : `${label} ${round(value, digits)}${suffix}`;
}

function diffText(current, previous, suffix, label) {
  if (!isFiniteValue(current) || !isFiniteValue(previous)) return `${label}等待更多数据`;
  const diff = round(Number(current) - Number(previous), 1);
  if (diff === 0) return `${label}维持稳定`;
  return `较上一条${diff > 0 ? "上升" : "下降"} ${Math.abs(diff)}${suffix}`;
}

function setupCanvas(canvas, height) {
  const rect = canvas.getBoundingClientRect();
  const cssHeight = rect.height || height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: cssHeight };
}

function drawGauge(canvas, score) {
  const { ctx, width, height } = setupCanvas(canvas, 220);
  const centerX = width / 2;
  const centerY = height * 0.78;
  const radius = Math.min(width * 0.38, height * 0.62, 142);
  const start = Math.PI;
  const end = Math.PI * 2;

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineWidth = 18;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, end);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(centerX - radius, 0, centerX + radius, 0);
  gradient.addColorStop(0, "#27d7e8");
  gradient.addColorStop(0.5, "#ffd166");
  gradient.addColorStop(1, "#ff4fac");
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, start + (end - start) * (score / 100));
  ctx.stroke();

  const ticks = [
    { value: 25, text: "轻" },
    { value: 52, text: "中" },
    { value: 75, text: "重" },
  ];
  ctx.font = "700 13px system-ui";
  ctx.fillStyle = "rgba(244,248,255,0.72)";
  ticks.forEach((tick) => {
    const angle = start + (end - start) * (tick.value / 100);
    const x = centerX + Math.cos(angle) * (radius + 24);
    const y = centerY + Math.sin(angle) * (radius + 24);
    ctx.fillText(tick.text, x - 7, y + 5);
  });
}

function drawLineChart(canvas, source, key, options) {
  const preferredHeight = Number(canvas.getAttribute("height")) || 220;
  const { ctx, width, height } = setupCanvas(canvas, preferredHeight);
  const compact = height < 170;
  const padding = { top: compact ? 16 : 22, right: compact ? 16 : 24, bottom: compact ? 28 : 38, left: compact ? 34 : 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = source.map((item) => (isFiniteValue(item[key]) ? Number(item[key]) : null)).filter(Number.isFinite);
  const labels = source.map((item) => formatShortDate(item.date));

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px system-ui";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(244,248,255,0.55)";

  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + (plotHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  if (!values.length) {
    ctx.fillText("暂无数据", padding.left, padding.top + 30);
    return;
  }

  const minValue = Number.isFinite(options.min) ? options.min : Math.min(...values);
  const maxValue = Number.isFinite(options.max) ? options.max : Math.max(...values);
  const spread = maxValue - minValue || 1;
  const paddedMin = Number.isFinite(options.min) ? minValue : minValue - spread * 0.18;
  const paddedMax = Number.isFinite(options.max) ? maxValue : maxValue + spread * 0.18;
  const range = paddedMax - paddedMin || 1;

  const points = source.map((item, index) => {
    const value = isFiniteValue(item[key]) ? Number(item[key]) : null;
    const x = padding.left + (source.length === 1 ? plotWidth / 2 : (plotWidth / (source.length - 1)) * index);
    const y = value !== null ? padding.top + plotHeight - ((value - paddedMin) / range) * plotHeight : null;
    return { x, y, value, label: labels[index] };
  });

  ctx.fillStyle = "rgba(244,248,255,0.58)";
  points.forEach((point) => {
    ctx.fillText(point.label, point.x - 12, height - 12);
  });

  const valid = points.filter((point) => Number.isFinite(point.y));
  if (!valid.length) return;

  ctx.beginPath();
  traceSmoothPath(ctx, valid);
  ctx.lineTo(valid.at(-1).x, padding.top + plotHeight);
  ctx.lineTo(valid[0].x, padding.top + plotHeight);
  ctx.closePath();
  ctx.fillStyle = options.fill;
  ctx.fill();

  ctx.beginPath();
  traceSmoothPath(ctx, valid);
  ctx.strokeStyle = options.color;
  ctx.lineWidth = 3;
  ctx.stroke();

  valid.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1019";
    ctx.fill();
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(244,248,255,0.9)";
    ctx.font = "700 12px system-ui";
    ctx.fillText(`${round(point.value, options.suffix === "分" ? 0 : 1)}${options.suffix}`, point.x - 16, point.y - 10);
  });
}

function traceSmoothPath(ctx, points) {
  if (!points.length) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function renderHistory() {
  el.historyBody.innerHTML = records
    .map((record) => {
      const auto = calculateAutophagy(record, previousRecordFor(record));
      return `<tr>
        <td>${record.date}</td>
        <td>${formatFasting(Number(record.fastingHours))}</td>
        <td><span class="stage-pill">${auto.stage} ${auto.score}分</span></td>
        <td>${valueText(record.bodyFat, "%")}</td>
        <td>${valueText(record.muscleRate, "%")}</td>
        <td>${valueText(record.proteinIntake, "g")}</td>
        <td>${record.energyBalance > 0 ? "+" : ""}${record.energyBalance ?? "--"} 千卡</td>
      </tr>`;
    })
    .join("");
}

function prefillForm(record) {
  if (document.activeElement && el.entryForm.contains(document.activeElement)) return;
  Object.entries(record).forEach(([key, value]) => {
    const input = el.entryForm.elements[key];
    if (input && value !== null && value !== undefined) input.value = key === "fastingHours" ? round(value, 1) : value;
  });
  if (el.entryForm.elements.date) el.entryForm.elements.date.value = toIsoDate(new Date());
}

el.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(el.entryForm);
  const record = {};
  formData.forEach((value, key) => {
    if (key === "date") record[key] = value;
    else record[key] = value === "" ? null : Number(value);
  });
  if (!isFiniteValue(record.activityKcal) && isFiniteValue(record.burnKcal) && isFiniteValue(record.bmrKcal)) {
    record.activityKcal = Math.max(0, record.burnKcal - record.bmrKcal);
  }
  records = records.filter((item) => item.date !== record.date).concat(record);
  render();
});

document.querySelector("#clearForm").addEventListener("click", () => {
  el.entryForm.reset();
  if (el.entryForm.elements.date) el.entryForm.elements.date.value = toIsoDate(new Date());
});

el.toggleHistory.addEventListener("click", () => {
  const isCollapsed = el.historyContent.classList.toggle("is-collapsed");
  el.toggleHistory.textContent = isCollapsed ? "展开明细" : "收起明细";
  el.toggleHistory.setAttribute("aria-expanded", String(!isCollapsed));
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  records = structuredClone(demoRecords);
  render();
});

el.imageUpload.addEventListener("change", (event) => {
  const files = [...event.target.files].slice(0, 12);
  uploadedFiles = files;
  el.previewStrip.innerHTML = "";
  files.forEach((file) => {
    const image = document.createElement("img");
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
    el.previewStrip.append(image);
  });
});

el.ocrButton.addEventListener("click", async () => {
  if (!uploadedFiles.length) {
    el.ocrStatus.textContent = "请先选择一张或多张截图。";
    return;
  }

  el.ocrButton.disabled = true;
  const parsedRecords = [];
  try {
    el.ocrStatus.textContent = "正在加载 OCR 识别模块...";
    await loadTesseract();
    for (let index = 0; index < uploadedFiles.length; index += 1) {
      const file = uploadedFiles[index];
      el.ocrStatus.textContent = `正在识别第 ${index + 1}/${uploadedFiles.length} 张：${file.name}`;
      const result = await window.Tesseract.recognize(file, "chi_sim+eng", {
        logger(message) {
          if (message.status === "recognizing text" && Number.isFinite(message.progress)) {
            el.ocrStatus.textContent = `正在识别第 ${index + 1}/${uploadedFiles.length} 张：${Math.round(message.progress * 100)}%`;
          }
        },
      });
      const parsed = parseOcrText(result.data.text);
      if (parsed.date) parsedRecords.push(parsed);
    }

    if (!parsedRecords.length) {
      el.ocrStatus.textContent = "没有识别到可保存的日期数据，请用下方表单手动输入。";
      return;
    }

    parsedRecords.forEach((record) => mergeRecord(record));
    render();
    el.ocrStatus.textContent = `已从 ${parsedRecords.length} 张截图识别并更新数据。请检查表格里的数字是否需要校正。`;
  } catch (error) {
    el.ocrStatus.textContent = `OCR 识别失败：${error.message || "未知错误"}。可以继续手动输入。`;
  } finally {
    el.ocrButton.disabled = false;
  }
});

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OCR 库加载失败，可能是网络无法访问 CDN"));
    document.head.append(script);
  });
}

function mergeRecord(record) {
  const existing = records.find((item) => item.date === record.date) || {};
  const merged = { ...existing };
  Object.entries(record).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") merged[key] = value;
  });
  records = records.filter((item) => item.date !== record.date).concat(merged);
}

function parseOcrText(text) {
  const compact = text.replace(/\s+/g, "");
  const spaced = text.replace(/[，,]/g, "");
  const record = {};
  const currentYear = new Date().getFullYear();

  const fullDate = compact.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  const shortDate = compact.match(/(\d{1,2})月(\d{1,2})日/);
  if (fullDate) {
    record.date = `${fullDate[1]}-${fullDate[2].padStart(2, "0")}-${fullDate[3].padStart(2, "0")}`;
  } else if (shortDate) {
    record.date = `${currentYear}-${shortDate[1].padStart(2, "0")}-${shortDate[2].padStart(2, "0")}`;
  }

  const fasting = compact.match(/(\d{1,2})小时(\d{1,2})分钟/);
  if (fasting) record.fastingHours = Number(fasting[1]) + Number(fasting[2]) / 60;

  record.energyBalance = matchNumber(spaced, /能量平衡\s*([-+]?\d{1,5})\s*千卡/);
  record.intakeKcal = matchNumber(spaced, /摄入量\s*\+?(\d{1,5})\s*千卡/);
  record.burnKcal = Math.abs(matchNumber(spaced, /燃烧\s*-?(\d{1,5})\s*千卡/) ?? NaN);
  record.bmrKcal = Math.abs(matchNumber(spaced, /基础代谢(?:率)?(?:\(BMR\))?\s*-?(\d{1,5})\s*千卡/) ?? NaN);
  record.activityKcal = Math.abs(matchNumber(spaced, /活动\s*-?(\d{1,5})\s*千卡/) ?? NaN);
  record.weightJin = matchNumber(spaced, /体重\s*(\d{2,3}(?:\.\d)?)\s*斤/);
  record.bodyFat = matchNumber(spaced, /体脂率(?:\(BFP\))?\s*(\d{1,2}(?:\.\d)?)%/);
  record.muscleRate = matchNumber(spaced, /肌肉率\s*(\d{1,2}(?:\.\d)?)%/);
  record.waterContent = matchNumber(spaced, /水分含量\s*(\d{1,2}(?:\.\d)?)%/);

  const nutritionProtein = spaced.match(/蛋白质\s*(\d{1,2})%\s*(\d{1,3})\s*克/);
  if (nutritionProtein) {
    record.proteinShare = Number(nutritionProtein[1]);
    record.proteinIntake = Number(nutritionProtein[2]);
  } else {
    record.proteinShare = matchNumber(spaced, /蛋白质含量\s*(\d{1,2}(?:\.\d)?)%/);
  }

  record.carbGrams = matchNumber(spaced, /碳水化合物\s*(?:\d{1,2}%\s*)?(\d{1,3})\s*克/);

  Object.keys(record).forEach((key) => {
    if (Number.isNaN(record[key])) delete record[key];
  });
  return record;
}

function matchNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});

render();
