# 细胞自噬健康仪表盘

这是一个本地优先的静态网页应用，用于记录每日健康截图和手动输入数据，并估算“ASI 细胞自噬代理指数”。它可以部署到 GitHub Pages，也可以直接在浏览器打开 `index.html` 使用。

## 重要说明

细胞自噬不能仅凭体重、体脂率、能量平衡、摄入量或空腹时间直接测量。真正测量自噬通常需要实验室方法，例如 LC3、p62、ULK1、mTOR、AMPK 等分子标志物，并且不同组织的反应也不同。因此，本应用里的 ASI 不是医学诊断，也不是临床检测值，而是把现有截图中可获得的生活方式和身体组成数据，转换成一个便于个人追踪趋势的代理指数。

## 学术依据摘要

自噬与营养压力密切相关。综述文献指出，细胞通过 mTORC1 和 AMPK 感知氨基酸与能量状态；当能量不足、AMP/ATP 或 ADP/ATP 比例升高、葡萄糖不足时，AMPK 可促进 ULK1 相关的自噬启动，而营养充足时 mTORC1 往往抑制自噬相关过程。[1]

热量限制和空腹会调节自噬反应，但效果取决于持续时间、个体代谢状态和组织类型。短期或长期热量限制可能带来适应性自噬反应，也可能在特殊病理或过度压力下产生不利反应，所以本应用只把它作为“趋势估算”。[2]

运动相关研究显示，人类骨骼肌中的自噬反应比动物或细胞模型更复杂。急性运动、运动训练和胰岛素刺激对 LC3、ULK1、mTORC1 等标志物的影响并不完全一致；训练可提高自噬/线粒体自噬调节能力，而急性反应需要谨慎解释。[3][4]

氨基酸，尤其亮氨酸和精氨酸等，可以通过 mTORC1 通路影响细胞生长和营养感知。由于 mTORC1 活跃通常与自噬抑制方向相关，本应用把“蛋白质 g/kg”作为氨基酸信号的反向调节项，但不把低蛋白解释为健康建议。[5]

人类间歇性空腹证据仍有局限，不同方案、样本量和终点差异很大，许多机制推断来自动物或细胞研究。因此，本应用的公式采用保守权重，并显示“数据完整度”。[6]

## ASI 计算公式

应用中的核心指数为 ASI，也就是 Autophagy Signal Index，取值范围 0 到 100：

```text
ASI = clamp(0, 100, 45F + 20D + 12C + 10A + 8P + 5T)
```

其中 `clamp(0,100,x)` 表示把结果限制在 0 到 100 之间。

### F：空腹窗口分

```text
F = clamp(0, 1, (fastingHours - 10) / 12)
```

空腹时间低于 10 小时时记为接近 0；从 10 小时到 22 小时逐渐提高；22 小时后趋于饱和。这样做是为了避免把空腹时长线性无限放大。

### D：能量压力分

```text
deficitKcal = max(0, -energyBalance)
D = clamp(0, 1, deficitKcal / (BMR * 0.65))
```

能量平衡为负数时代表能量缺口。缺口越接近基础代谢的 65%，能量压力分越高。如果没有 BMR，会用燃烧热量的估算值或默认值兜底。

### C：低碳水或低摄入分

```text
如果有碳水克数：
C = clamp(0, 1, 1 - carbGrams / 130)

如果没有碳水克数但有摄入热量：
C = clamp(0, 1, 1 - intakeKcal / 1200)
```

碳水和总体摄入越低，营养限制代理信号越高。这里不是建议长期低碳水或低摄入，而是用于解释当日自噬代理信号。

### A：活动燃烧分

```text
A = clamp(0, 1, activityKcal / (BMR * 0.35))
```

活动燃烧相对 BMR 越高，说明当天能量需求压力越明显。由于人类运动与自噬的组织反应复杂，这一项权重低于空腹和能量缺口。

### P：氨基酸信号反向分

```text
weightKg = weightJin * 0.5
proteinPerKg = proteinIntake / weightKg
P = clamp(0, 1, 1 - proteinPerKg / 1.2)
```

蛋白质摄入相对体重越高，氨基酸/mTORC1 营养信号越强，ASI 中的“自噬代理分”会被轻微下调。这个分项只用于建模，不表示蛋白质越少越健康。

### T：体成分趋势分

```text
fatTrend = clamp(0, 1, (previousBodyFat - currentBodyFat) / 0.8)
weightTrend = clamp(0, 1, (previousWeightJin - currentWeightJin) / 2)
T = average(fatTrend, weightTrend)
```

如果上一条记录到当前记录出现体脂率或体重下降，说明可能存在短期能量动员趋势。该项权重只有 5%，因为单日体重和体脂率会受水分、测量时间和设备误差影响。

## 分级

```text
0-29：基础
30-54：轻度
55-77：中度
78-100：重度
```

这些分级是用于个人趋势管理的界面标签，不是医学级别。

## 扩展指标

应用会利用每日截图或手动输入的数据，额外计算以下指标：

- 脂肪质量 = 体重kg × 体脂率
- 去脂体重 = 体重kg - 脂肪质量
- 肌肉质量 = 体重kg × 肌肉率
- 蛋白质密度 = 蛋白质摄入g / 体重kg
- 能量缺口/BMR = 当日能量缺口 / 基础代谢
- 活动/BMR = 活动燃烧 / 基础代谢
- 碳水密度 = 碳水g / 体重kg
- 七日有效记录 = 过去 7 个日历日中有数据的天数

## 数据和隐私

默认情况下，数据保存在浏览器的 `localStorage` 中。上传截图用于本地预览和可选 OCR 识别；如果网页能访问 OCR CDN，会在浏览器端加载识别库。应用不会自建服务器，也不会把你的数据同步到 GitHub。部署到 GitHub Pages 后，网页本身是公开可访问的，但你在手机浏览器里录入的数据仍保存在该手机浏览器本地。

## 参考文献

[1] [Autophagy: The Last Defense against Cellular Nutritional Stress](https://pmc.ncbi.nlm.nih.gov/articles/PMC6054220/)

[2] [The Beneficial and Adverse Effects of Autophagic Response to Caloric Restriction and Fasting](https://pmc.ncbi.nlm.nih.gov/articles/PMC10509423/)

[3] [Exercise and exercise training-induced increase in autophagy markers in human skeletal muscle](https://pubmed.ncbi.nlm.nih.gov/29626392/)

[4] [Regulation of autophagy in human skeletal muscle: effects of exercise, exercise training and insulin stimulation](https://pubmed.ncbi.nlm.nih.gov/26614120/)

[5] [Regulation of mTORC1 by amino acids in mammalian cells: A general picture of recent advances](https://pubmed.ncbi.nlm.nih.gov/34738031/)

[6] [Intermittent fasting and human metabolic health](https://pmc.ncbi.nlm.nih.gov/articles/PMC4516560/)
