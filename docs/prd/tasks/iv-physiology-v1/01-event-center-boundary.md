# 任务 01：确认事件中心技术归属与数据边界

类型：HITL
状态：ready-for-human-decision
Blocked by：None - can start immediately
User stories covered：30

## What to build

完成统一 `Event` 中心的技术归属、跨模块数据边界和最小契约决策。该任务不要求实现业务功能，但必须产出后续开发可以直接使用的决策文档和契约草案，防止把生理事件、医务复测、证据链和关闭校验继续塞进现有 `Alert` 告警语义。

## Acceptance criteria

- [ ] 明确统一 `Event` 中心由哪个服务或模块拥有。
- [ ] 明确 `Alert` 只作为算法或设备告警输入和证据来源，不承担监管事件关闭语义。
- [ ] 明确 VIDEO、DEVICE/iot-sink、WEB、iot-system 之间的事件、样本、动作、证据、readiness 契约。
- [ ] 列出 P0 必需对象：Event、Physiology Sample、Action、Medical Recheck、Evidence Chain、Readiness、Report。
- [ ] 输出迁移、接口、权限、审计的实现边界，供任务 02-15 直接引用。

## Implementation notes

- 不要在本任务里实现大量代码。
- 决策应遵守 ADR：统一事件中心、可信 person_id、真实医务适配器优先、上游样本归一化、最小治理入口。
- 重点交付“后续任务不会互相踩边界”的清晰契约。

## Suggested verification

- 人工评审事件模型决策文档。
- 检查后续任务是否都能引用同一套对象和状态语义。
