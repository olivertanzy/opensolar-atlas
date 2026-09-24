# Human anatomy module

This is the first non-astronomy contribution using the documented module contract.
Created with `npm run create:model -- human-anatomy`. Integration is limited to
`module.js`, `ModelView.vue`, `scene.js`, local data/assets, and the two registry
entries. `App.vue`, `ModelLibrary.vue` and the solar renderer are unchanged.

Open `/?model=human-anatomy&lang=en` (or `zh-CN`, `zh-TW`, `ja`, `ko`).
The application starts the native Three.js scene in `onMounted`, watches Vue layer
state, and disposes it in `onBeforeUnmount`. Models are fetched only when a layer
is enabled; loaded layers remain cached until the view is unmounted.

## Geometry and coverage

### Independent male and female samples

The selector switches independent source datasets and disposes the previous
scene/GPU buffers. Male uses BodyParts3D below; female uses HRA. A male model is
never stretched or reused to fill missing female structures. Coverage and pose
differ, so differences between these atlases are not all sex differences.

**See inside the head** saves the enabled layers, shows neural structures alone
and opens a movable sagittal cutaway. Exit restores the layers. This clips existing
surfaces without synthesizing tissue cross-sections or scan images.

### Female: HRA / HuBMAP v1.10

Browne, Kristen, and Heidi Schlehlein. 2026. *3D Reference Organ Set for Female,
v1.10.* [doi:10.48539/HBM637.DWBM.744](https://doi.org/10.48539/HBM637.DWBM.744).
License: **CC BY 4.0**, including the raw model. Official metadata and ontology
crosswalk: `sources/hra-female-*`. Source URL, source hash, transformations and
derivative hashes: `assets/female/provenance.json`.

| Layer | Source meshes | Coverage |
| --- | ---: | --- |
| Skeleton | 89 | Pelvis, vertebral column/discs, sternum and selected lower-limb bones; no skull, ribs or upper-limb skeleton |
| Arteries | 53 | Selected organ arterial surfaces |
| Veins | 57 | Selected organ venous surfaces |
| Neural | 316 | Registered Allen brain structures, spinal cord segments and selected eye nerves; no limb peripheral tree |
| Outline | 1 | Source female skin surface |

HRA is an assembly of registered organ references, not all measured from one
female individual. Original labels (including anatomical variants) and UBERON
identifiers are retained. The approximate meridian drawing has not been registered
to this female assembly, so that layer is disabled for the female sample.

`scripts/build-anatomy-female.mjs` extracts the above nodes from the official GLB,
bakes the original hierarchical transforms, then translates all parts by
`[0, 0.8, 0.12]` metres. There is **no scaling or deformation**. Exactly coincident
vertices are welded; meshoptimizer 1.2.0 simplifies surfaces with an absolute
algorithmic error limit of 0.0005 m. This metric is not a clinical accuracy claim
or Hausdorff-distance guarantee. Bounds are recomputed, normals generated at
load, and source materials replaced with layer colors. Derived models retain
CC BY 4.0 attribution. The original 374 MB GLB is not bundled.

To reproduce, download the `source` URL from provenance to the ignored
`test-results/anatomy-download/3d-vh-f-united.glb`, then run:

```sh
npm ci
node scripts/build-anatomy-female.mjs
npm run test:anatomy:data
```

### Male: BodyParts3D

[BodyParts3D / DBCLS download](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html),
version **4.0**, archive **20130619**, official **99% polygon reduction** set.
Retrieved 2026-09-25. Reference adult male anatomy; surfaces are simplified and are
not patient-specific. The source's element count is not a count of human bones.

| Layer | Source classification | Meshes | Scope |
| --- | --- | ---: | --- |
| Skeleton | FMA5018, FMA12516, FMA7591 | 245 | Bone elements, teeth and costal cartilages |
| Arteries | FMA50720 | 562 | Available arterial surface elements; no added capillaries |
| Veins | FMA50723 | 342 | Available venous surface elements; no added branches |
| Neural structures | FMA55676, FMA65132, FMA45638 | 72 | Brain segments, selected cranial nerves and neural subdivisions |
| Body outline | FMA7163 | 1 | Original skin surface, optional and translucent |

**Neural coverage is partial:** this atlas does not reconstruct a full spinal cord
or limb peripheral nerves. Missing anatomy is not fabricated. Artery/vein colors
are layer keys, not a map of blood oxygenation. Red/blue also apply to pulmonary
vessels. Model bounds shown in the inspector measure the simplified mesh, not a
clinical reference range. Unreviewed part names retain their source English and
FMA identifiers. UI and layer descriptions cover all five supported languages.

The official coordinate diagram is preserved in `sources/coordinate_system.png`:
source X points left, Y posterior, Z superior, in millimetres. Conversion is
`(x,y,z) -> (x,z,-y) / 1000`, a rotation and uniform unit conversion to metres.
No independent per-part centering, scaling or deformation is applied. GLBs use
indexed positions; Three.js computes smooth normals at load. There are no remote
textures or decoder services. Colors and illumination are presentation choices.

`assets/catalog.json` contains each original element ID, FMA ID, English name,
world bounds, triangle count and SHA-256 of its source OBJ. A few original OBJ
headers have no concept/name: their smallest available containing classification
is taken from the official membership table and marked `parentLabel: true`.
`assets/provenance.json` records archive and output GLB hashes.

## License and attribution

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International**

The [provider's current license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
and saved `sources/README_e.html` specify **CC BY 4.0**, updated 2025-02-27.
Old OBJ headers inside the 2013 archive still say CC BY-SA 2.1 Japan. This
conversion uses the provider's explicitly updated database license and documents
that discrepancy instead of silently treating those comments as current.
The project's MIT license covers our code, not a replacement license for these
assets. Retain attribution and the changes above in downstream distributions.

## Reproduce assets

Download these files from the
[official archive](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20130619/):

- `isa_BP3D_4.0_obj_99.zip` to `test-results/anatomy-download/` (ignored; 142,903,898 bytes).
- `isa_element_parts.txt`, `isa_parts_list_e.txt`, `isa_parts_list.txt`,
  `isa_inclusion_relation_list.txt`, `README_e.html`, `coordinate_system.png`
  are preserved in this module's `sources/` directory.

Run Python 3 (standard library only):

```sh
python scripts/build-anatomy.py
# Or python scripts/build-anatomy.py /path/to/archive-directory
```

The converter follows the provider's element memberships, deduplicates element
IDs per layer, triangulates OBJ faces, preserves coordinates and emits GLB 2.0.
Do not download, bundle or execute a different atlas without reviewing its rights.

## Traditional meridian layer

`meridians.js` is an **original approximate educational drawing** under MIT,
not a downloaded medical model or digitized WHO coordinate set. It draws overview
courses of the 12 primary meridians plus CV/GV, and only four named point examples:
LI 4 (Hegu), PC 6 (Neiguan), ST 36 (Zusanli), GV 20 (Baihui). Paired structures
are mirrored for presentation. It does not provide all 361 acupuncture points.

Reference facts:

- [Guangdong Administration of TCM, 12 meridian course overview, 2023-02-17](https://szyyj.gd.gov.cn/zyyfw/ysbj/content/post_4096781.html): channel names and broad course directions.
- [Tongnan Health Commission, extraordinary meridians, 2024-02-28](https://www.cqtn.gov.cn/bm/qwsjkw/zwgk_25192/zfxxgkml_bm/jkkp/202402/t20240228_12970105.html): anterior CV and posterior GV midlines.
- [WHO, Standard acupuncture nomenclature, ISBN 9290611057](https://www.who.int/publications/i/item/9290611057): nomenclature reference, not 3D geometry.
- [Fengcheng Health Centre, Haiyang, 2024-05-27](https://www.yantai.gov.cn/art/2024/5/27/art_93149_3196137.html): general regions for the four point examples. No treatment claims are reproduced.

The metre-space control points are editorial placements on this reference body,
**not measured or validated locations**. Paths omit internal trajectories,
branches and detailed surface meanders. Tube thickness and point radii are visual
symbols, not tissue sizes. They are not vessels or nerves and cannot locate
acupuncture sites. The separate layer, visible notes and inspector all retain
this distinction. Future precise registration requires an appropriately licensed
coordinate atlas and anatomical review; replace this file, do not relabel these
coordinates as scientific measurements. TARA's restricted ontology was considered
but is not included or adapted.

## Verification

Each anatomical layer uses one merged draw mesh. Per-part bounds and shared-buffer
raycast views retain selection. Static scenes stop redrawing; dragging has no
inertial continuation. GLB parsing is serialized to reduce allocation spikes.
HTTP 5xx retries once; failed layers have an explicit retry button. A missing GLB
or HTML fallback produces an outdated-URL message with a page-reload action.

Browser regressions cover all six layers, repeated drags, an idle-frame check and
draw-call budget, cutaway, repeated male/female switches, a single-canvas lifecycle,
failed requests and HTML fallback. These do not guarantee FPS on every device.

```sh
npm run test:anatomy
npm run test:anatomy:data
npm run test:shell
npm run build
npm run test:anatomy:production
```

`test:anatomy` exercises conditional loading, switches, opacity, source search,
mesh picking, named schematic examples, camera reset, five languages/mobile,
unmount/context disposal, failed-layer retry and leaving during a download.
Unit checks validate GLB geometry, source memberships, hashes, metre conversion,
unique IDs and the boundary between measured source geometry and illustration.
The same independent anatomy test runs against built assets under a Pages-style
subpath, with external requests blocked. It never opens or tests the solar module.
Full-repository regression remains a separate CI responsibility.

## 中文说明

人体按接入文档作为独立模块注册。骨骼、动脉、静脉使用原始解剖表面数据；
男性神经源只有脑部与部分脑神经；女性 HRA 组合源另含脊髓分段，二者都缺少四肢周围神经。
现在可切换独立男女样本，女性骨骼覆盖骨盆、脊柱、胸骨及部分下肢骨，缺少颅骨、肋骨、
上肢骨等，不能视为完整骨架。两个图谱的差异并不全是性别差异。
“查看头部内部”会隐藏遮挡图层，并允许调整剖开位置，退出后恢复原图层。
经络为有参考出处的人工近似示意，含 14 条概览路线与 4 个穴位示例，不能用于取穴。
不要把它宣传为完整人体模型、实测经络坐标或医疗工具。未来贡献者可以在本目录
更换经过许可核验的模型及数据，无需修改太阳系模块或主应用框架。
