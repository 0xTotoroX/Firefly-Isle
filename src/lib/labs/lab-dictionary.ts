/**
 * [INPUT]: 依赖 @/types/patient 的 LabResult 与 LabResultCategory 领域类型，吸收 update-followup-data skill 的三类实验室行映射。
 * [OUTPUT]: 对外提供 LAB_INDICATORS、LAB_CATEGORY_LABELS、findLabIndicator、parseReferenceRange、normalizeLabCandidate 与稳定实验室项目字典。
 * [POS]: lib/labs 的实验室字典与 OCR 候选归一化边界，把本地 Excel 行号知识翻译成网页端 itemCode/itemName/unit/reference 的应用事实。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { LabResult, LabResultCategory } from '@/types/patient'

export type ReferenceRange = {
  high?: number
  low?: number
}

export type LabIndicator = {
  aliases: string[]
  category: LabResultCategory
  code: string
  isDerived?: boolean
  name: string
  referenceHigh?: number
  referenceLow?: number
  unit?: string
}

export type LabCandidate = {
  itemName: string
  rawText?: string
  referenceHigh?: number | string
  referenceLow?: number | string
  referenceRange?: string
  testDate?: string
  unit?: string
  value?: number | string
}

export type NormalizedLabCandidate = {
  indicator?: LabIndicator
  message: string
  rawName: string
  reading?: LabResult
  status: 'mapped' | 'unmapped' | 'invalid-value'
}

export const LAB_CATEGORY_LABELS: Record<LabResultCategory, string> = {
  'blood-biochemistry': '血生化',
  'blood-routine': '血常规',
  'tumor-marker': '肿瘤标志物',
}

function indicator(
  category: LabResultCategory,
  code: string,
  name: string,
  options: Omit<LabIndicator, 'aliases' | 'category' | 'code' | 'name'> & { aliases?: string[] } = {},
): LabIndicator {
  return {
    aliases: [code, name, ...(options.aliases ?? [])],
    category,
    code,
    isDerived: options.isDerived,
    name,
    referenceHigh: options.referenceHigh,
    referenceLow: options.referenceLow,
    unit: options.unit,
  }
}

const bloodRoutine = [
  indicator('blood-routine', 'wbc', '白细胞', { aliases: ['白细胞计数', 'WBC'], referenceHigh: 9.5, referenceLow: 3.5, unit: '10^9/L' }),
  indicator('blood-routine', 'neutrophil_percent', '中性粒细胞百分比', { aliases: ['中性粒细胞%', 'NEUT%', 'NE%'], referenceHigh: 75, referenceLow: 40, unit: '%' }),
  indicator('blood-routine', 'lymphocyte_percent', '淋巴细胞百分比', { aliases: ['淋巴细胞%', 'LYMPH%', 'LY%'], referenceHigh: 50, referenceLow: 20, unit: '%' }),
  indicator('blood-routine', 'monocyte_percent', '单核细胞百分比', { aliases: ['单核细胞%', 'MONO%', 'MO%'], referenceHigh: 10, referenceLow: 3, unit: '%' }),
  indicator('blood-routine', 'eosinophil_percent', '嗜酸性粒细胞百分比', { aliases: ['嗜酸性粒细胞%', 'EO%'], referenceHigh: 5, referenceLow: 0.4, unit: '%' }),
  indicator('blood-routine', 'basophil_percent', '嗜碱性粒细胞百分比', { aliases: ['嗜碱性粒细胞%', 'BASO%', 'BA%'], referenceHigh: 1, referenceLow: 0, unit: '%' }),
  indicator('blood-routine', 'neutrophil_abs', '中性粒细胞绝对值', { aliases: ['中性粒细胞数', 'NEUT#', 'NE#'], referenceHigh: 6.3, referenceLow: 1.8, unit: '10^9/L' }),
  indicator('blood-routine', 'lymphocyte_abs', '淋巴细胞绝对值', { aliases: ['淋巴细胞数', 'LYMPH#', 'LY#'], referenceHigh: 3.2, referenceLow: 1.1, unit: '10^9/L' }),
  indicator('blood-routine', 'monocyte_abs', '单核细胞绝对值', { aliases: ['单核细胞数', 'MONO#', 'MO#'], referenceHigh: 0.6, referenceLow: 0.1, unit: '10^9/L' }),
  indicator('blood-routine', 'eosinophil_abs', '嗜酸性粒细胞绝对值', { aliases: ['嗜酸性粒细胞数', 'EO#'], referenceHigh: 0.52, referenceLow: 0.02, unit: '10^9/L' }),
  indicator('blood-routine', 'basophil_abs', '嗜碱性粒细胞绝对值', { aliases: ['嗜碱性粒细胞数', 'BASO#', 'BA#'], referenceHigh: 0.06, referenceLow: 0, unit: '10^9/L' }),
  indicator('blood-routine', 'rbc', '红细胞计数', { aliases: ['红细胞', 'RBC'], referenceHigh: 5.1, referenceLow: 3.8, unit: '10^12/L' }),
  indicator('blood-routine', 'hemoglobin', '血红蛋白', { aliases: ['HGB', 'Hb'], referenceHigh: 150, referenceLow: 115, unit: 'g/L' }),
  indicator('blood-routine', 'hematocrit', '红细胞压积', { aliases: ['HCT', '红细胞比容'], referenceHigh: 45, referenceLow: 35, unit: '%' }),
  indicator('blood-routine', 'mcv', '红细胞平均体积', { aliases: ['MCV'], referenceHigh: 100, referenceLow: 82, unit: 'fL' }),
  indicator('blood-routine', 'mch', '红细胞平均血红蛋白量', { aliases: ['MCH'], referenceHigh: 34, referenceLow: 27, unit: 'pg' }),
  indicator('blood-routine', 'mchc', '红细胞平均血红蛋白浓度', { aliases: ['MCHC'], referenceHigh: 360, referenceLow: 316, unit: 'g/L' }),
  indicator('blood-routine', 'rdw_cv', '红细胞分布宽度-CV值', { aliases: ['RDW-CV', '红细胞分布宽度CV'], referenceHigh: 15, referenceLow: 11, unit: '%' }),
  indicator('blood-routine', 'platelet', '血小板', { aliases: ['血小板计数', 'PLT'], referenceHigh: 350, referenceLow: 125, unit: '10^9/L' }),
  indicator('blood-routine', 'mpv', '血小板平均体积', { aliases: ['MPV'], referenceHigh: 13, referenceLow: 7.4, unit: 'fL' }),
  indicator('blood-routine', 'pct', '血小板压积', { aliases: ['PCT'], referenceHigh: 0.28, referenceLow: 0.1, unit: '%' }),
  indicator('blood-routine', 'pdw', '血小板分布宽度', { aliases: ['PDW'], referenceHigh: 18, referenceLow: 9, unit: 'fL' }),
  indicator('blood-routine', 'p_lcr', '大血小板比率', { aliases: ['P-LCR', '大型血小板比率'], referenceHigh: 43, referenceLow: 13, unit: '%' }),
  indicator('blood-routine', 'ret_percent', '网织红细胞百分率', { aliases: ['RET%', '网织红细胞百分比'], referenceHigh: 2.5, referenceLow: 0.5, unit: '%' }),
  indicator('blood-routine', 'ret_abs', '网织红细胞绝对值', { aliases: ['RET#', '网织红细胞数'], referenceHigh: 0.1, referenceLow: 0.024, unit: '10^12/L' }),
  indicator('blood-routine', 'ret_maturity_index', '网织红细胞成熟指数', { aliases: ['RMI'], unit: '%' }),
  indicator('blood-routine', 'lfr', '低荧光网织红细胞百分率', { aliases: ['LFR'], unit: '%' }),
  indicator('blood-routine', 'mfr', '中荧光网织红细胞百分率', { aliases: ['MFR'], unit: '%' }),
  indicator('blood-routine', 'hfr', '高荧光网织红细胞百分率', { aliases: ['HFR'], unit: '%' }),
  indicator('blood-routine', 'nlr', 'NLR', { aliases: ['中性粒/淋巴比值', '中性粒细胞/淋巴细胞'], isDerived: true }),
  indicator('blood-routine', 'plr', 'PLR', { aliases: ['血小板/淋巴比值'], isDerived: true }),
  indicator('blood-routine', 'mlr', 'MLR', { aliases: ['单核/淋巴比值'], isDerived: true }),
] satisfies LabIndicator[]

const bloodBiochemistryNames = [
  ['total_protein', '总蛋白', 'TP', 'g/L', 65, 85],
  ['albumin', '白蛋白', 'ALB', 'g/L', 40, 55],
  ['globulin', '球蛋白', 'GLOB', 'g/L', 20, 40],
  ['ag_ratio', '白蛋白/球蛋白', 'A/G', undefined, 1.2, 2.4],
  ['alt', '丙氨酸氨基转移酶', 'ALT', 'U/L', 0, 40],
  ['alp', '碱性磷酸酶', 'ALP', 'U/L', 45, 125],
  ['ast', '天门冬氨酸氨基转移酶', 'AST', 'U/L', 0, 40],
  ['che', '胆碱脂酶', 'CHE', 'U/L', 4000, 12600],
  ['ggt', 'γ-谷氨酰转移酶', 'GGT', 'U/L', 7, 45],
  ['ldh', '乳酸脱氢酶', 'LDH', 'U/L', 120, 250],
  ['ck', '肌酸激酶', 'CK', 'U/L', 26, 192],
  ['sod', '超氧化物歧化酶', 'SOD', 'U/mL', 129, 216],
  ['beta_hydroxybutyrate', 'β-羟丁酸', 'β-HB', 'mmol/L', 0, 0.6],
  ['total_bilirubin', '总胆红素', 'TBIL', 'μmol/L', 3.4, 20.5],
  ['direct_bilirubin', '直接胆红素', 'DBIL', 'μmol/L', 0, 6.8],
  ['indirect_bilirubin', '间接胆红素', 'IBIL', 'μmol/L', 1.7, 13.7],
  ['afu', 'α-L-岩藻糖苷酶', 'AFU', 'U/L', 0, 40],
  ['gpda', '甘氨酰脯氨酸二肽氨基肽酶', 'GPDA', 'U/L', 44, 116],
  ['total_bile_acid', '总胆汁酸', 'TBA', 'μmol/L', 0, 10],
  ['crp', 'C-反应蛋白', 'CRP', 'mg/L', 0, 10],
  ['urea', '尿素', 'UREA', 'mmol/L', 2.6, 7.5],
  ['creatinine', '肌酐', 'CREA', 'μmol/L', 41, 73],
  ['uric_acid', '尿酸', 'UA', 'μmol/L', 155, 357],
  ['glucose', '葡萄糖', 'GLU', 'mmol/L', 3.9, 6.1],
  ['triglyceride', '甘油三酯', 'TG', 'mmol/L', 0, 1.7],
  ['beta2_microglobulin', 'β2-微球蛋白', 'β2-MG', 'mg/L', 0.8, 2.4],
  ['total_cholesterol', '总胆固醇', 'TC', 'mmol/L', 0, 5.2],
  ['hdl_c', '高密度脂蛋白胆固醇', 'HDL-C', 'mmol/L', 1, 1.55],
  ['ldl_c', '低密度脂蛋白胆固醇', 'LDL-C', 'mmol/L', 0, 3.4],
  ['apo_a1', '载脂蛋白A-I', 'ApoA1', 'g/L', 1, 1.6],
  ['apo_b', '载脂蛋白B', 'ApoB', 'g/L', 0.6, 1.1],
  ['lipoprotein_a', '脂蛋白a', 'Lp(a)', 'mg/L', 0, 300],
  ['sd_ldl', '小而密低密度脂蛋白', 'sdLDL', 'mmol/L', 0, 1.17],
  ['apo_e', '载脂蛋白E', 'ApoE', 'mg/L', 27, 49],
  ['potassium', '钾', 'K', 'mmol/L', 3.5, 5.3],
  ['sodium', '钠', 'Na', 'mmol/L', 137, 147],
  ['chloride', '氯', 'Cl', 'mmol/L', 99, 110],
  ['calcium', '钙', 'Ca', 'mmol/L', 2.11, 2.52],
  ['phosphorus', '磷', 'P', 'mmol/L', 0.85, 1.51],
  ['magnesium', '镁', 'Mg', 'mmol/L', 0.75, 1.02],
  ['ada', '腺苷脱氨酶', 'ADA', 'U/L', 4, 24],
  ['cystatin_c', '胱抑素C', 'CysC', 'mg/L', 0.51, 1.09],
  ['prealbumin', '前白蛋白', 'PA', 'mg/L', 200, 400],
  ['osmolality', '渗透压', 'OSM', 'mOsm/kg', 280, 310],
  ['transferrin', '转铁蛋白', 'TRF', 'g/L', 2, 3.6],
  ['zinc', '锌', 'Zn', 'μmol/L', 10.7, 19.5],
  ['copper', '铜', 'Cu', 'μmol/L', 11, 22],
  ['free_fatty_acid', '游离脂肪酸', 'FFA', 'mmol/L', 0.1, 0.9],
  ['sialic_acid', '唾液酸', 'SA', 'mg/L', 450, 780],
  ['lipase', '脂肪酶（LIP）', 'LIP', 'U/L', 13, 60],
  ['carbon_dioxide', '二氧化碳', 'CO2', 'mmol/L', 22, 29],
  ['homocysteine', '同型半胱氨酸', 'HCY', 'μmol/L', 0, 15],
  ['saa', '血清淀粉样蛋白A', 'SAA', 'mg/L', 0, 10],
  ['retinol_binding_protein', '视黄醇结合蛋白', 'RBP', 'mg/L', 25, 70],
  ['lap', '亮氨酸氨基肽酶', 'LAP', 'U/L', 30, 70],
  ['amylase', '淀粉酶', 'AMY', 'U/L', 35, 135],
  ['egfr', '肾小球滤过率', 'eGFR', 'mL/min/1.73m²', 90, undefined],
] as const

const tumorMarkers = [
  indicator('tumor-marker', 'cea', '癌胚抗原（CEA）', { aliases: ['CEA', '癌胚抗原'], referenceHigh: 5, referenceLow: 0, unit: 'ng/mL' }),
  indicator('tumor-marker', 'ca125', '糖类抗原125（CA125）', { aliases: ['CA125', '糖类抗原125'], referenceHigh: 35, referenceLow: 0, unit: 'U/mL' }),
  indicator('tumor-marker', 'ca15_3', '糖类抗原153（CA15-3）', { aliases: ['CA15-3', 'CA153', '糖类抗原153'], referenceHigh: 25, referenceLow: 0, unit: 'U/mL' }),
  indicator('tumor-marker', 'ca19_9', '糖类抗原199（CA19-9）', { aliases: ['CA19-9', 'CA199', '糖类抗原199'], referenceHigh: 37, referenceLow: 0, unit: 'U/mL' }),
  indicator('tumor-marker', 'ca50', '糖类抗原50（CA50）', { aliases: ['CA50', '糖类抗原50'], referenceHigh: 25, referenceLow: 0, unit: 'U/mL' }),
  indicator('tumor-marker', 'ca72_4', '糖类抗原724（CA72-4）', { aliases: ['CA72-4', 'CA724', '糖类抗原724'], referenceHigh: 6.9, referenceLow: 0, unit: 'U/mL' }),
] satisfies LabIndicator[]

const bloodBiochemistry = bloodBiochemistryNames.map(([code, name, alias, unit, low, high]) =>
  indicator('blood-biochemistry', code, name, {
    aliases: alias ? [alias] : [],
    referenceHigh: high,
    referenceLow: low,
    unit,
  }),
)

export const LAB_INDICATORS = [...bloodRoutine, ...bloodBiochemistry, ...tumorMarkers] satisfies LabIndicator[]

function normalizeTextKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[（）()[\]【】{}]/g, '')
    .replace(/[γ]/g, 'g')
    .replace(/[α]/g, 'a')
    .replace(/[β]/g, 'b')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
}

const indicatorLookup = new Map<string, LabIndicator>()

for (const item of LAB_INDICATORS) {
  for (const alias of item.aliases) {
    indicatorLookup.set(`${item.category}:${normalizeTextKey(alias)}`, item)
  }
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  const parsed = Number(match?.[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

export function findLabIndicator(category: LabResultCategory, nameOrCode: string) {
  return indicatorLookup.get(`${category}:${normalizeTextKey(nameOrCode)}`) ?? null
}

export function getLabIndicatorsByCategory(category: LabResultCategory) {
  return LAB_INDICATORS.filter((item) => item.category === category)
}

export function matchLabIndicatorInText(category: LabResultCategory, text: string) {
  const normalized = normalizeTextKey(text)
  const candidates = getLabIndicatorsByCategory(category)
    .flatMap((item) => item.aliases.map((alias) => ({ item, key: normalizeTextKey(alias) })))
    .filter((candidate) => candidate.key.length > 0 && normalized.includes(candidate.key))
    .sort((left, right) => right.key.length - left.key.length)

  return candidates[0]?.item ?? null
}

export function getReferenceRangeForIndicator(itemCode: string): ReferenceRange | null {
  const item = LAB_INDICATORS.find((entry) => entry.code === itemCode)

  if (!item || (item.referenceLow === undefined && item.referenceHigh === undefined)) {
    return null
  }

  return {
    high: item.referenceHigh,
    low: item.referenceLow,
  }
}

export function parseReferenceRange(input: string | undefined): ReferenceRange | null {
  if (!input?.trim()) {
    return null
  }

  const normalized = input
    .replace(/[≤≦]/g, '<=')
    .replace(/[≥≧]/g, '>=')
    .replace(/[~～至—–]/g, '-')
    .replace(/参考(?:范围|值)?[:：]?/g, '')
  const range = normalized.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)

  if (range) {
    return { high: Number(range[2]), low: Number(range[1]) }
  }

  const high = normalized.match(/(?:<=|<|低于|小于)\s*(-?\d+(?:\.\d+)?)/)

  if (high) {
    return { high: Number(high[1]) }
  }

  const low = normalized.match(/(?:>=|>|高于|大于)\s*(-?\d+(?:\.\d+)?)/)

  return low ? { low: Number(low[1]) } : null
}

export function normalizeLabCandidate(candidate: LabCandidate, category: LabResultCategory): NormalizedLabCandidate {
  const rawName = candidate.itemName.trim()
  const item = findLabIndicator(category, rawName)
  const value = toNumber(candidate.value)

  if (!item) {
    return {
      message: '未匹配到内置实验室字典，请复核或排除该行。',
      rawName,
      status: 'unmapped',
    }
  }

  if (value === undefined) {
    return {
      indicator: item,
      message: '缺少有效数值，请修正后再保存。',
      rawName,
      status: 'invalid-value',
    }
  }

  const parsedRange = parseReferenceRange(candidate.referenceRange)
  const referenceLow = toNumber(candidate.referenceLow) ?? parsedRange?.low ?? item.referenceLow
  const referenceHigh = toNumber(candidate.referenceHigh) ?? parsedRange?.high ?? item.referenceHigh

  return {
    indicator: item,
    message: '已匹配到内置实验室字典。',
    rawName,
    reading: {
      category,
      itemCode: item.code,
      itemName: item.name,
      referenceHigh,
      referenceLow,
      source: 'ocr',
      testDate: candidate.testDate,
      unit: candidate.unit?.trim() || item.unit,
      value,
    },
    status: 'mapped',
  }
}
