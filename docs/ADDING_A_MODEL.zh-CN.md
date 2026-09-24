# 如何新增一个 3D 主题模块

[English](ADDING_A_MODEL.md) · [架构说明](ARCHITECTURE.md)

项目采用 **Vue 3 + 原生 Three.js**。太阳系与人体已作为独立主题接入；[人体模块说明](../src/modules/human-anatomy/README.md)提供完整接入实例及数据范围说明。
新增主题通过代码贡献完成，不需要重做首页，也不需要修改太阳系渲染器。

## 1. 创建并运行模板

在 Node.js 20 或更新版本下，在仓库目录执行：

```sh
npm ci
npm run create:model -- my-structure
```

模块 ID 使用小写字母、数字和连字符。命令拒绝非法路径及已有目录，不覆盖原有贡献。
生成目录 `src/modules/my-structure/`：

| 文件 | 职责 |
| --- | --- |
| `module.js` | 模型卡片元数据、五语言名称和延迟加载入口 |
| `ModelView.vue` | Vue 响应式状态、工作台插槽、场景生命周期 |
| `scene.js` | 原生 Three.js 几何、相机、交互和资源释放 |
| `README.md` | 此模块的资料来源、许可、局限和验证记录 |

打开 `src/modules/registry.js`，增加一个导入和一个注册条目：

```js
import solarSystem from './solar-system/module.js';
import myStructure from './my-structure/module.js';

export const modelModules = Object.freeze({
  [solarSystem.id]: solarSystem,
  [myStructure.id]: myStructure,
});
// 保留此文件原有的 resolveModule、moduleText、routeFromSearch 函数。
```

执行 `npm run dev`，访问 `/?model=my-structure&lang=zh-CN`。
模型库会自动出现新卡片、分类和入口。模板提供一米立方体、旋转、滚轮／双指缩放、
部件显隐和重置视角。它只是用于验证接入的几何示例，**不是人体模型或科学重建**。
模板默认不注册到正式模型库。

## 2. 填写模块配置

`module.js` 默认导出普通对象。首页会读取各模块的配置，因此不要在文件顶层加载
大型资产、初始化 Three.js 或请求专业数据；放在 `loadView` 或模块生命周期中执行。

| 必填项 | 约定 |
| --- | --- |
| `id` | 稳定且唯一，与目录、注册键一致 |
| `version` | 模块版本，如 `0.1.0` |
| `unit` | 一个世界单位的含义，如 `m`、`mm`、`km` |
| `name` | 包含 `en`、`zh-CN`、`zh-TW`、`ja`、`ko` 的名称对象 |
| `category` | 同样的五语言分类，英文值作为分类筛选的标识 |
| `description` | 五语言简介，准确说明实际提供的内容 |
| `credit` | 模型卡片展示的来源／作者简写 |
| `loadView()` | 返回 Promise，解析结果的 default 为 Vue 组件 |

可选 `cover` 是装饰性封面 URL，例如 `new URL('./assets/cover.svg', import.meta.url).href`。
不提供时使用通用几何符号。封面示意图不应被当作科学测量依据。

**统一视觉规范：** 封面使用透明的 640×360（16:9）画布，沿用象牙白、薄荷绿、珊瑚色
线稿配色。背景、分类标签、内边距、等宽卡片及底部按钮对齐由模型库统一管理，封面不要
重复绘制背景、标题或来源标签。新增模块不得覆盖 `.model-card`、`.model-grid` 或主导航。
太阳系和人体的封面可作为参考。界面沿用共享 `--atlas-*` CSS 变量和工作台工具按钮；
模式切换使用 `.workbench-segment`，以 `aria-pressed` 表示选中态。检查五种语言中的长标题和介绍。

生成模板的名称和简介暂时在五个语言字段重复英文示例。**正式贡献前请补全经过审校的翻译**。
`moduleText(配置, 字段名, 语言)` 会在缺少指定语言时退回英文。
来源没有支持的内容，不要标成官方、精确、完整或临床级。

当前没有在线上传插件、远程安装模块或执行用户代码功能。新增模块通过 Git PR 审核代码；
访问参数只匹配本地注册表，未注册的 ID 显示明确提示。

## 3. 使用共用工作台

`@/components/ModelWorkbench.vue` 提供统一布局，`@` 指向 `src/`。
顶部是主题工具栏，左边是目录，中间是 3D 画布，右边是详情，底部是状态；手机上侧栏变为抽屉。

```vue
<ModelWorkbench
  :title="title"
  :catalog-label="text('objects')"
  :details-label="text('details')"
  v-model:catalog-open="catalogOpen"
  v-model:details-open="detailsOpen"
>
  <template #toolbar><!-- 本主题的操作按钮 --></template>
  <template #catalog><!-- 部件、分组、图层、搜索 --></template>
  <template #stage><!-- Three.js 容器和画布叠加信息 --></template>
  <template #details><!-- 选中部件的介绍、资料与局限 --></template>
  <template #status><!-- 单位、加载进度、操作提示 --></template>
  <template #overlays><!-- 可选弹窗 --></template>
</ModelWorkbench>
```

可选 `expanded` 属性隐藏两侧栏以展开画布，`stageClass` 给画布区域添加模块专属样式类。
这些只是布局接口。人体的分层显示、机械拆解等操作由各自模块实现，不写进应用外壳。

模块样式使用 Vue 的 `scoped` 和专用类名。不要添加全局 `header`、`aside`、`footer`、
`canvas` 选择器。语言切换由顶层框架提供，不需要在模块中重复放全局导航或语言选择器。
现有 `SceneViewport.vue`、`BodyProfile.vue` 仍是太阳系专用组件，不是其他主题的通用接口。

## 4. 接入真实模型

保留模板中的 `onMounted` 初始化、`onBeforeUnmount` 清理方式。
Vue 负责选中项、显隐、加载状态和提示，Three.js 驱动负责几何、材质、相机与控制器。
渲染器和网格保存在普通变量中，不要放进 Vue 的深层响应式对象。
通过 `watch` 将小规模 UI 状态更新传给驱动。

例如把自包含的 GLB 放进 `src/modules/my-structure/assets/model.glb`：

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const modelUrl = new URL('./assets/model.glb', import.meta.url).href;
// 放在场景的异步加载函数内部：
const gltf = await new GLTFLoader().loadAsync(modelUrl);
```

上面是加载片段，不是完整驱动。需要补上加载中、失败、重试状态；若加载完成时模块已经卸载，
应直接释放返回的几何、材质和纹理，不再加入场景。可取消的网络请求应主动取消。
加载真实几何后移除示例立方体。模型引用的外部纹理或解码器需要一并打包或明确披露联网依赖。

Vite 会处理模块相对的 `new URL(..., import.meta.url)` 和 `?url` 导入。
不要写 `/assets/model.glb` 这样的根绝对路径，GitHub Pages 子目录下会失效。
未被 Vite 导入、通过 fetch 加载的 JSON 或原始资料文件，要明确加入
`scripts/build-site.cjs` 的发布白名单。不要把整个工作区拷贝进 `dist`。

每个主题独立确定：

- 世界单位、坐标轴、原点、资产到世界坐标的换算。
- 与实际尺寸相匹配的相机远近裁剪、缩放范围。
- 旋转、平移、点选、显隐、单独查看等操作。
- 部件稳定 ID、来源、详细介绍与缺失状态。
- 几何简化、重建、补绘和测量不确定性。

太阳系采用千米和天文坐标。人体结构可以采用毫米和自己的朝向，不应复用太阳系半径字段、
天文相机范围或地球瓦片逻辑。

卸载时需取消动画帧、断开观察器、移除监听器、释放 controls、geometry、material、texture，
关闭自己持有的 ImageBitmap，终止请求并释放 renderer、移除画布。
不要误释放其他模块持有的共享资源。模板演示了同步几何的清理；导入资产后要补齐纹理和异步任务清理。

## 5. 科学依据、开源许可与多语言

模块 README 写明原始来源链接、作者、版本／日期、许可、署名要求、单位、坐标系、转换过程和局限。
必要时在 `THIRD_PARTY.md` 加入资产许可。项目代码的 MIT 许可不会覆盖第三方模型的许可。
尽量保留原始依据、获取步骤和校验值，便于其他贡献者核查。

接入人体结构时，明确具体结构范围、样本／模型的适用范围、简化和缺失；不能把通用模型
说成某个真实个体的准确解剖，也不能默认为诊断工具。等模型、许可、资料说明准备好后再注册。

通过 `@/i18n/index.js` 获取共享的 `locale`，默认英语。
小模块可像模板一样维护独立词典，控件、错误和缺失提示都要覆盖英语、简体中文、繁体中文、日语、韩语。
资料原名、编号、未经审校的专有名词保留原文，并说明其性质。

## 6. 验证与提交 PR

新增主题只需验证自己的数据、渲染与交互，以及共享外壳的接入流程，**不依赖运行或修改其他主题的测试**。
下面以人体模块为例；贡献其他主题时，使用该主题自己的测试脚本：

```sh
npm run test:anatomy:data
npx playwright install chromium
npm run test:anatomy
npm run test:shell
npm run build
npm run test:anatomy:production
```

全仓库回归由 CI 另外执行。只有改动共享行为时，才按影响范围补测关联模块。

Windows 可设置 `BROWSER_CHANNEL=msedge` 使用已安装的 Edge。
`test:shell` 会临时生成并注入一个模板模块，验证不依赖天文数据的第二个模型可以运行；
不修改实际注册表，也不发布测试模块。覆盖导航和前进后退、独立加载、五语言手机布局、
加载失败重试、场景释放，以及加载中离开时不误创建旧场景。
这些只是框架测试，贡献者仍需为自己的模型内容和交互补充验证。

提交前确认：

- 干净安装后，模型卡片、直接链接和默认英语都可用。
- 切出后场景资源释放，切回只有一个画布和一套监听器。
- 手机抽屉、拖动、双指缩放、键盘导航正常。
- 缺失或损坏的模型文件会给出可恢复的状态。
- 构建产物放在 `/opensolar-atlas/` 子目录也能加载模型及资料。
- PR 附上截图、来源、许可说明和已知局限。

正常新增主题不需要修改 `App.vue`、`ModelLibrary.vue` 或太阳系驱动。
不要提交构建目录、测试截图、账号凭据或无权分发的资产。
