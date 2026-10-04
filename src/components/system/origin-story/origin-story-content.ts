/**
 * [INPUT]: 不依赖运行时模块，只保存用户指定的公开 YouTube 帖子内容、来源归属与访问地址。
 * [OUTPUT]: 对外提供标题、副标题、公开故事段落、正文末尾来源地址、正文拼接与页脚文案。
 * [POS]: components/system/origin-story 的单一公开内容源，被 V3 临床档案阅读弹层与内容合同测试共同消费。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export const originStoryTitle = '为什么做一页萤屿'
export const originStorySubtitle = '生命'
export const originStorySourceLabel = '原帖：YouTube 社区帖子'
export const originStorySourceUrl = 'https://www.youtube.com/post/Ugkx2pyfj6hZm_j7M4tjutIm7D9BFqg-mfyB'
export const originStorySourceText = `${originStorySourceLabel} ${originStorySourceUrl}`

export const storyParagraphs = [
  '今天遇到一个让我印象很深的病人。',
  '一位92岁的墨西哥老人，严重心力衰竭。到了这个阶段，除了药物维持，我们已经没有太多能够逆转病情的治疗手段。',
  '老人身体非常虚弱，说话断断续续，但意识始终十分清楚，思维也很敏捷。他很明白自己的病情，也知道现在的治疗更多是在争取时间，而不是治愈。',
  '因此，今天上午，他决定签署 DNI 和 DNR。',
  '简单来说：',
  'DNI（Do Not Intubate），就是如果以后发生呼吸衰竭，不进行气管插管，不使用有创呼吸机。',
  'DNR（Do Not Resuscitate），就是如果心脏或呼吸停止，不实施心肺复苏（CPR）。',
  '很多人误以为签了 DNR、DNI 就意味着“放弃治疗”，其实并不是。常规治疗、药物、吸氧、护理、缓解痛苦等措施都会继续进行，只是在生命走到最后一刻时，不再采用创伤性抢救。',
  '上午老人已经准备签字。',
  '没想到，中午护士通知我们：“老人改主意了。”',
  '这种情况其实并不少见，我们也不会干涉病人的决定。护士接着说：“不过，他想和你们聊聊。”',
  '于是，我和主治医生来到病房。',
  '老人看到我们，没有马上说话，而是抬起手，指了指病房里的电视。',
  '他喘着气，一字一句地说：',
  '“我想……等世界杯决赛看完……再签，可以吗？”',
  '“在那之前，如果还能把我救回来，就尽量救回来。我想看决赛。”',
  '病房里一下子安静了。',
  '我和主治医生相视一笑，毫不犹豫地点头。',
  '“当然可以。”',
  '那一刻，我突然觉得，医学很多时候并不是简单地讨论抢救还是不抢救。',
  '真正重要的是尊重病人的意愿。',
  '对于这位老人来说，他不是害怕死亡。',
  '他只是希望，在离开这个世界之前，再看完一场自己期待已久的世界杯决赛。',
  '人生到了最后，支撑一个人继续走下去的，有时候不是昂贵的药物，不是先进的设备，而只是一个再普通不过的愿望。',
  '而我们能做的，就是尽力帮他把这个愿望，留到终场哨响的那一刻。',
]

export const originStoryText = [...storyParagraphs, originStorySourceText].join('\n\n')

export const originStoryFooter = '公开原帖内容经页面排版整理；不构成医疗建议，医疗决策请与专业医生共同作出。'
