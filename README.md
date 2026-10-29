# 冒险岛页游（Web/H5 双端）

基于 Phaser 3 + TypeScript + Vite 的单页 Web 游戏，纯静态构建产物（`dist/`）可部署至任意静态托管，同时支持：

- **Web 端**：PC 浏览器，键盘（WASD/方向键移动，J/空格攻击，E 交互）+ 鼠标点击交互
- **H5 端**：移动浏览器，虚拟摇杆 + 攻击/对话触控按钮，低帧率自动降级

## 运行

```bash
npm install
npm run dev      # 本地调试
npm run build    # tsc --noEmit 类型检查 + Vite 构建，产出 dist/
npm run test     # vitest 纯逻辑单元测试
npm run preview  # 预览构建产物
```

## 结构

```
public/assets/          # 静态资源（分包清单 packs/core.json、占位精灵、Tiled 地图）
scripts/                # 占位资源生成器（正式素材可原路径替换）
src/
  main.ts               # 入口：场景流 Boot → Preload → Game + UIScene
  core/                 # 配置、设备检测、性能监控、事件总线、GameState（可序列化预留）
  scenes/               # Boot/Preload（分包加载+失败重试+30s 超时）/Game/UIScene
  entities/             # Player / Enemy / Npc
  systems/              # input（键鼠/虚拟摇杆 → 统一 Intent）、combat、interaction、碰撞回退
  ui/                   # LoadingUI、DialogBox、Joystick、HUD、遮罩
  data/                 # npc.json / enemy.json / quality.json 配置
```

## 说明

- 设计分辨率 960×540，Scale FIT 自适应；H5 竖屏仅提示旋转。
- 战斗为即时制最小闭环（固定伤害 + 1s 无敌帧 + 3s 重生）；NPC 交互为对话。
- 降级阈值集中在 `src/data/quality.json`，可低成本调整。
- 占位美术资源由 `scripts/generate-placeholder-assets.mjs` 程序化生成。
- 多人在线与数据持久化本期不落地，游戏状态收敛为 `GameState` 可序列化对象作扩展预留。
