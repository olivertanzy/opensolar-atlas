# OpenSolar Atlas / 真实尺度太阳系

双击 `index.html`，用现代 Edge、Chrome、Firefox 或 Safari 打开。页面、三维引擎、观测图和星历均保存在本地；查看外部资料来源时才需要联网。不需要安装 App 或启动开发工具。

拖动旋转，滚轮或双指缩放。搜索天体并点击即可飞近；全景、内太阳系和卫星系统保持相同的物理比例。手机底部按钮打开名录和档案。可将解压后的目录整体上传至静态网站服务，手机通过网址访问。

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
- `data/verification.json`：比例、统一历元、缺测处理、搜索及移动布局检查结果。
- `scripts/`：资料处理和页面验证脚本。构建脚本需 Python、Pillow、lxml、NumPy、spiceypy；浏览器验证使用 Playwright。网页运行不依赖这些工具。

引擎为 Three.js r160，许可证位于 vendor 中。NASA、JPL、USGS、STScI 原图及相关署名见网页与来源清单；不能把原有署名抹掉后宣称原创。

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
