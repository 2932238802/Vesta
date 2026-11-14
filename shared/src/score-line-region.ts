/** 31 个省级地区、考研 A/B 区与省份归一化。仅用于分数线模块，不放业务无关常量。 */

export interface ProvinceInfo {
  name: string
  /** 省级教育考试院入口；接入前逐个校验，失败由抓取状态兜底。 */
  examUrl: string
}

export const provinces: ProvinceInfo[] = [
  { name: '北京', examUrl: 'https://www.bjeea.cn/' },
  { name: '天津', examUrl: 'http://www.zhaokao.net/' },
  { name: '河北', examUrl: 'http://www.hebeea.edu.cn/' },
  { name: '山西', examUrl: 'http://www.sxkszx.cn/' },
  { name: '内蒙古', examUrl: 'http://www.nm.zsks.cn/' },
  { name: '辽宁', examUrl: 'http://www.lnzsks.com/' },
  { name: '吉林', examUrl: 'https://www.jleea.com.cn/' },
  { name: '黑龙江', examUrl: 'http://www.lzk.hl.cn/' },
  { name: '上海', examUrl: 'https://www.shmeea.edu.cn/' },
  { name: '江苏', examUrl: 'https://www.jseea.cn/' },
  { name: '浙江', examUrl: 'https://www.zjzs.net/' },
  { name: '安徽', examUrl: 'https://www.ahzsks.cn/' },
  { name: '福建', examUrl: 'https://www.eeafj.cn/' },
  { name: '江西', examUrl: 'http://www.jxeea.cn/' },
  { name: '山东', examUrl: 'https://www.sdzk.cn/' },
  { name: '河南', examUrl: 'https://www.haeea.cn/' },
  { name: '湖北', examUrl: 'http://www.hbea.edu.cn/' },
  { name: '湖南', examUrl: 'https://jyt.hunan.gov.cn/jyt/sjyt/hnsjyksy/web/index.html' },
  { name: '广东', examUrl: 'https://eea.gd.gov.cn/' },
  { name: '广西', examUrl: 'https://www.gxeea.cn/' },
  { name: '海南', examUrl: 'http://ea.hainan.gov.cn/' },
  { name: '重庆', examUrl: 'https://www.cqksy.cn/' },
  { name: '四川', examUrl: 'https://www.sceea.cn/' },
  { name: '贵州', examUrl: 'http://zsksy.guizhou.gov.cn/' },
  { name: '云南', examUrl: 'https://www.ynzs.cn/' },
  { name: '西藏', examUrl: 'http://zsks.edu.xizang.gov.cn/' },
  { name: '陕西', examUrl: 'https://www.sneea.cn/' },
  { name: '甘肃', examUrl: 'https://www.ganseea.cn/' },
  { name: '青海', examUrl: 'http://www.qhjyks.com/' },
  { name: '宁夏', examUrl: 'https://www.nxjyks.cn/' },
  { name: '新疆', examUrl: 'https://www.xjzk.gov.cn/' }
]

export const provinceNames = provinces.map((item) => item.name)
export const provinceSet = new Set(provinceNames)

/** 考研国家线 A 区（21 个省级地区）。 */
export const aRegionProvinces = new Set([
  '北京',
  '天津',
  '河北',
  '山西',
  '辽宁',
  '吉林',
  '黑龙江',
  '上海',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '重庆',
  '四川',
  '陕西'
])

/** 考研国家线 B 区（10 个省级地区）。 */
export const bRegionProvinces = new Set([
  '内蒙古',
  '广西',
  '海南',
  '贵州',
  '云南',
  '西藏',
  '甘肃',
  '青海',
  '宁夏',
  '新疆'
])

const suffixMap: Record<string, string> = {
  北京市: '北京',
  天津市: '天津',
  上海市: '上海',
  重庆市: '重庆',
  内蒙古自治区: '内蒙古',
  广西壮族自治区: '广西',
  西藏自治区: '西藏',
  宁夏回族自治区: '宁夏',
  新疆维吾尔自治区: '新疆',
  香港特别行政区: '',
  澳门特别行政区: '',
  台湾省: ''
}

// 省级简称：把「浙江省」「广东」等都落成注册表里的短名。
const shortByPrefix = new Map(provinceNames.map((name) => [name, name]))

/** 把任意常见写法归一成注册表短名；认不出返回空串。 */
export function normalizeProvince(value: string | null | undefined): string {
  const raw = String(value ?? '').replace(/\s+/g, '').trim()
  if (!raw) return ''
  if (provinceSet.has(raw)) return raw
  if (suffixMap[raw] !== undefined) return suffixMap[raw]
  for (const [prefix, name] of shortByPrefix) {
    if (raw === `${prefix}省` || raw === `${prefix}市`) return name
  }
  for (const name of provinceNames) {
    if (raw.startsWith(name)) return name
  }
  return ''
}

/** 考研省份 → A 区 / B 区；专升本或认不出返回空串。 */
export function provinceRegion(province: string): 'A区' | 'B区' | '' {
  const name = normalizeProvince(province)
  if (aRegionProvinces.has(name)) return 'A区'
  if (bRegionProvinces.has(name)) return 'B区'
  return ''
}

export function isProvince(value: string): boolean {
  return normalizeProvince(value) !== ''
}

export function provinceExamUrl(province: string): string {
  const name = normalizeProvince(province)
  return provinces.find((item) => item.name === name)?.examUrl ?? ''
}
