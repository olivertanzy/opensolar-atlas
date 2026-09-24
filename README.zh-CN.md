# OpenSolar Atlas / 开放 3D 模型库

**[在线预览：atlas.fancivision.com](https://atlas.fancivision.com/)**

基于 Vue 3 + 原生 Three.js 的开放 3D 模型库，太阳系是第一个已接入主题。框架提供模型库、贡献指南、统一工作台和手机侧栏，不同主题独立管理模型、单位、相机和资料。使用 Node.js 20 或更新版本，执行 `npm ci`、`npm run dev`，打开终端显示的本地地址。生产预览执行 `npm run build`、`npm run preview`；部署时上传 `dist/`。Vue 模块需要 HTTP 服务，不再支持双击源码 `index.html`。

新增 3D 结构请看[中文接入指南](docs/ADDING_A_MODEL.zh-CN.md)或[English guide](docs/ADDING_A_MODEL.md)。执行 `npm run create:model -- my-structure` 可生成能直接运行的 Vue + Three.js 模板，注册后模型库自动显示入口。人体模块已按此流程接入：骨骼、动静脉、局部神经结构及单独的传统经络示意。可切换男性 BodyParts3D 与女性 HRA 独立样本，支持头部剖开观察。女性骨架覆盖不完整，神经另含脊髓分段；两种样本均不含四肢周围神经。经络不是实测定位，暂未配准至女性样本。见[人体来源与范围](src/modules/human-anatomy/README.md)，访问 `?model=human-anatomy` 体验。

首页进入模型库，`?model=solar-system` 打开太阳系，`?view=guide` 打开贡献指南；原有 `?body=...` 链接仍兼容。打开模型库或其他模型不加载太阳系大型数据。

默认英语，可切换简体中文、繁体中文、日语、韩语，并记住选择。`?lang=zh-CN&body=699` 可直接打开中文土星档案。安装和构建完成后，关闭高清影像即可经本地 HTTP 服务离线使用；地球高清影像和外部来源网页需要联网。未审校的正式天体名称保留原文，原始中文备注单独标注。

拖动旋转，滚轮或双指缩放。搜索天体并点击即可飞近；全景、内太阳系和卫星系统保持相同的物理比例。手机底部按钮打开名录和档案，支持手机通过部署网址访问。

## 逐天体资料与扩展

选择地球后，在右侧“探索地球”搜索国家或城市，点击结果即可定位；手机先打开“天体档案”。可切换国家／地区和城市／城镇，按国家筛选城市，并分别开关边界和城市地名。近距离显示更多城镇，背面地名自动隐藏，地球上的地名也可点击。

已接入 Natural Earth v5.1.2 的 242 个国家／地区记录和 7,342 个城市／城镇点位。这是独立开放制图数据，不是各国官方地图；记录包含地区，并非主权国家数量。边界沿用数据源的实际控制口径，城市并非全球全部聚落。来源、尺度、版本与校验值见 `data/earth/manifest.json`。

地球默认启用“高清影像 · 需联网”，随视野和缩放加载 NASA GIBS 的 Blue Marble 分级影像，最高约 500 米分辨率，影像为 2004 年 8 月合成，并非实时画面。无账号或 API Key 要求；未接入街道级影像、建筑或地形网格。关闭开关可完全使用本地基础图，断网或请求失败保留缓存／本地底图；原始低分辨率底图仅作回退。详情见 `docs/EARTH.md`。

471 个天体均有独立档案，包括官方目录身份、已知尺寸、固定历元位置、外观依据及缺测说明。其中 460 条发现记录保留 JPL 的发现年份、发现者、临时编号及参考文献；55 个天体提供物理参数表，保留原有单位、不确定度和参考编号。32 个主要天体另有依据 NASA 页面整理的五语言背景介绍，其余天体明确提示尚未整理专门的背景文章，不编造地质或外观。

介绍是本项目依据官方资料编写的摘要及翻译，不是官方译文，也不意味着穷尽该天体全部已知知识。每个档案附对应来源与核对日期。

三维场景在 Vue `onMounted` 中初始化，卸载时释放渲染器、纹理、网格及事件监听。新主题复用 `ModelWorkbench` 的工具栏、目录、画布、详情、状态插槽。`npm run test:shell` 用临时生成的第二模块验证切换、独立数据和资源释放，测试模块不会加入发布目录。见[架构说明](docs/ARCHITECTURE.md)和[开源项目准备说明](docs/OPEN_SOURCE.md)。

## 数据范围

- 2026-09-24 获取的 JPL 行星卫星发现目录，共 460 条，加月球合计 461 颗卫星；另含太阳、八大行星、冥王星，共 471 个档案。
- 这是行星与冥王星卫星目录，不是所有小行星及其他矮行星伴星的全集。
- 469 个天体有 2026-09-24 00:00:00 TDB 的 Horizons 几何位置。Daphnis 的该日期星历不可用，S/2009 S1 未匹配编号，只展示档案。
- 81 个天体有参考尺寸；其中 80 个同时具有位置并生成网格。未知尺寸只显示定位标记，不赋予虚构半径。
- 接入 29 张有来源的观测或科普地图；无影像的网格明确标为占位。每个档案说明波段、颜色处理、缺测及配准限制。

## 比例与精度

1 场景单位 = 1 km，天体半轴与空间位置共用此比例，未压缩行星距离、放大卫星。屏幕文字和定位符号不代表物理大小。相机使用局部原点和对数深度。

这是固定星历的参考椭球可视化，并非所有天体的精确地形重建，也不是实时天气。多数历史纹理未完成地物经度的独立配准；只有明确标注的地图采用已查证投影。不计算光照，各方向直接显示原图颜色，不模拟昼夜明暗。未知区域用中性灰色显示参考形状。缩放按距参考表面的距离平滑推进；“展开视图”可收起两侧档案。土星主环为采用 NASA 半径的环面；颜色、透明度及细纹为科普示意，未逐条配准。具体限制见页面“数据与精度”。

## 可核查资料

- `data/horizons/`：逐个天体的 JPL 原始 JSON 响应。
- `data/catalog.json`：解析后的目录、物理参数与来源。
- `data/asset-manifest.json`：影像下载地址、转换信息及原始文件 SHA-256。
- `data/pck00011.tpc`、`data/naif0012.tls`：SPICE 内核。
- `data/discovery-records.json`、`data/physical-records.json`：逐天体官方资料及源文件校验值。
- `test-results/verification.json`：本机浏览器检查生成的报告，不随站点发布。
- `scripts/`：资料处理和页面验证脚本。构建脚本需 Python、Pillow、lxml、NumPy、spiceypy；浏览器验证使用 Playwright。网页运行不依赖这些工具。

执行 `npm test`、`npm run test:browser`、`npm run test:earth`、`npm run build`、`npm run test:production` 进行验证。浏览器测试首次需要 `npx playwright install chromium`；Windows 可通过 `BROWSER_CHANNEL=msedge` 使用已安装的 Edge。

引擎为 Three.js r160，界面为 Vue 3，许可证位于 vendor 中。NASA、JPL、USGS、STScI 原图及相关署名见网页与来源清单；不能把原有署名抹掉后宣称原创。

## 主要来源

- [JPL 行星卫星发现目录](https://ssd.jpl.nasa.gov/sats/discovery.html)
- [JPL 卫星物理参数](https://ssd.jpl.nasa.gov/sats/phys_par/)
- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [NAIF PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)
- [Hubble OPAL](https://archive.stsci.edu/hlsp/opal)
- [NASA Blue Marble](https://svs.gsfc.nasa.gov/2915/)
- [NASA LRO 月球地图及处理说明](https://svs.gsfc.nasa.gov/4720/)
- [USGS 木卫一地图](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km)
- [JPL 历史纹理与局限说明](https://space.jpl.nasa.gov/tmaps/)

This work used data acquired from the NASA/ESA HST Space Telescope, associated with OPAL program (PI: Simon, GO13937), and archived by the Space Telescope Science Institute, which is operated by the Association of Universities for Research in Astronomy, Inc., under NASA contract NAS 5-26555. All maps are available at https://doi.org/10.17909/T9G593.

太阳：NASA JPL STEREO/SDO 304埃假彩色全景，https://svs.gsfc.nasa.gov/30362 。水星：USGS MESSENGER Team / ASU 2013全球拼接，使用官方1024像素预览。

土星云图与环纹理：Solar System Scope / INOVE，https://www.solarsystemscope.com/textures/ ，CC BY 4.0：https://creativecommons.org/licenses/by/4.0/ 。云图包含原作者补绘，非完整实拍；本项目重新编码云图，将环纹理映射到 NASA 半径的主环环面。云图镜像：https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_saturn.jpg 。

天王星与海王星同样采用 Solar System Scope / INOVE 的 CC BY 4.0 科普贴图（来源与许可同上），含原作者补绘及增强色；本项目仅重新编码。原 OPAL 观测图保留，不用其缺测区作为完整外观。
