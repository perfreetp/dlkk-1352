import type { AIActor, ChatMessage, Relation, ChatSpeed } from '@/types';
import { generateId } from './storage';

interface ResponseTemplate {
  patterns: string[];
  responses: string[];
}

const toneTemplates: Record<string, ResponseTemplate> = {
  '温和友善': {
    patterns: ['你好', '问候', '打招呼'],
    responses: [
      '你好呀~今天过得怎么样？',
      '很高兴见到你！有什么想聊的吗？',
      '嗨，真开心能和你聊天。',
      '你好你好，最近有什么有趣的事情吗？',
    ]
  },
  '高冷傲娇': {
    patterns: ['你好', '问候'],
    responses: [
      '哼，又是你啊。',
      '...你好。',
      '有什么事吗，别耽误我时间。',
      '哦，是你啊。说吧，什么事。',
    ]
  },
  '活泼开朗': {
    patterns: ['你好', '问候'],
    responses: [
      '哇！你好你好！今天超级开心见到你！',
      '嗨嗨嗨！来啦来啦！',
      '耶！又可以聊天啦！',
      '哈喽哈喽！今天心情超好的！',
    ]
  },
  '深沉忧郁': {
    patterns: ['你好', '问候'],
    responses: [
      '...你好。',
      '嗯，又是新的一天。',
      '你好...有什么事吗。',
      '又是你啊...也好，有人说说话。',
    ]
  },
  '幽默风趣': {
    patterns: ['你好', '问候'],
    responses: [
      '哟，来啦？快坐快坐，瓜子花生随便拿！',
      '你好你好，今天又想听什么段子？',
      '欢迎欢迎，热笑欢迎！',
      '哟，稀客呀！今天想听我讲什么？',
    ]
  },
  '知性优雅': {
    patterns: ['你好', '问候'],
    responses: [
      '你好，很高兴与你交流。',
      '您好，请问有什么可以探讨的吗？',
      '你好，今天想聊些什么呢？',
      '很高兴见到你，期待我们的对话。',
    ]
  },
};

const topicTransitions = [
  '说起来，最近我在想一个问题...',
  '对了，说到这个，让我想起一件事。',
  '诶，你知道吗？我最近发现...',
  '话说回来，你有没有觉得...',
  '说起来，我最近遇到一件很有意思的事。',
  '对了，你最近怎么样？',
  '说到这里，我突然想到...',
];

const agreementResponses = [
  '说得对！我也是这么想的。',
  '嗯嗯，我同意你的看法。',
  '没错没错，就是这样！',
  '你说得很有道理。',
  '确实是这样，我深有同感。',
  '哈哈哈，太对了！',
];

const disagreementResponses = [
  '这个嘛...我倒是有点不同的看法。',
  '嗯...我不完全同意呢。',
  '话是这么说，但我觉得...',
  '可能每个人想法不一样吧。',
  '我倒是觉得不一定是这样。',
  '你的想法很有趣，不过我有不同的见解。',
];

const questionResponses = [
  '这个问题问得好，让我想想...',
  '嗯，这倒是个有意思的问题。',
  '为什么这么问呢？你是怎么想的？',
  '这个嘛...还真不好说呢。',
  '哈哈，你考我呀？让我想想。',
];

const neutralResponses = [
  '原来如此，挺有意思的。',
  '嗯嗯，这样啊。',
  '听起来还不错。',
  '确实呢。',
  '有意思，继续说说？',
  '我懂你的意思。',
];

const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const analyzeContext = (message: string): { type: 'greeting' | 'question' | 'agreement' | 'disagreement' | 'neutral'; keywords: string[] } => {
  const lowerMessage = message.toLowerCase();
  
  if (/你好|嗨|哈喽|早上好|晚上好|下午好|hi|hello/.test(lowerMessage)) {
    return { type: 'greeting', keywords: ['问候'] };
  }
  if (/.?\?|？/.test(message)) {
    return { type: 'question', keywords: ['问题'] };
  }
  if (/同意|对的|没错|说得好|有道理|同感/.test(lowerMessage)) {
    return { type: 'agreement', keywords: ['同意'] };
  }
  if (/不同意|不对|不是|不见得|未必|但是|不过/.test(lowerMessage)) {
    return { type: 'disagreement', keywords: ['不同意'] };
  }
  return { type: 'neutral', keywords: [] };
};

const applyToneStyle = (response: string, tone: string): string => {
  const toneStyles: Record<string, (s: string) => string> = {
    '温和友善': (s) => s.replace(/[！!]/g, '~').replace(/[。.]/g, '...'),
    '高冷傲娇': (s) => s.replace(/[~！]/g, '').split('').map((c, i) => i === 0 ? c : c).join(''),
    '活泼开朗': (s) => s + '！',
    '深沉忧郁': (s) => '...' + s,
    '幽默风趣': (s) => '哈哈哈，' + s,
    '知性优雅': (s) => s,
  };
  const styler = toneStyles[tone];
  return styler ? styler(response) : response;
};

const generateResponseBasedOnRelation = (
  baseResponse: string,
  relation: Relation | undefined,
  actorName: string
): string => {
  if (!relation) return baseResponse;
  
  switch (relation.stance) {
    case 'friendly':
      if (relation.intimacy > 80) {
        return `${actorName}，${baseResponse} 对了，晚上一起吃饭吗？`;
      }
      return `${actorName}，${baseResponse}`;
    case 'hostile':
      return baseResponse.replace(/你好/g, '哼').replace(/很高兴/g, '不怎么');
    case 'complex':
      return baseResponse + '... 算了，不说这个了。';
    default:
      return baseResponse;
  }
};

export const generateAIResponse = (
  actor: AIActor,
  history: ChatMessage[],
  allActors: AIActor[],
  relation?: Relation
): ChatMessage => {
  const lastMessage = history.filter(m => m.type === 'ai').slice(-1)[0];
  const lastActor = lastMessage?.actorId 
    ? allActors.find(a => a.id === lastMessage.actorId) 
    : undefined;
  
  let response: string;
  
  if (!lastMessage || history.length === 0) {
    const template = toneTemplates[actor.tone] || toneTemplates['温和友善'];
    response = getRandomItem(template.responses);
  } else {
    const context = analyzeContext(lastMessage.content);
    
    let responsePool: string[];
    switch (context.type) {
      case 'greeting':
        const template = toneTemplates[actor.tone] || toneTemplates['温和友善'];
        responsePool = template.responses;
        break;
      case 'question':
        responsePool = questionResponses;
        break;
      case 'agreement':
        responsePool = Math.random() > 0.3 ? agreementResponses : neutralResponses;
        break;
      case 'disagreement':
        responsePool = Math.random() > 0.5 ? disagreementResponses : neutralResponses;
        break;
      default:
        responsePool = Math.random() > 0.3 
          ? neutralResponses 
          : [getRandomItem(topicTransitions) + ' ' + getRandomItem(neutralResponses)];
    }
    
    response = getRandomItem(responsePool);
  }
  
  response = applyToneStyle(response, actor.tone);
  
  if (lastActor) {
    response = generateResponseBasedOnRelation(response, relation, lastActor.name);
  }
  
  if (actor.memory && Math.random() > 0.7) {
    const memoryItems = actor.memory.split(/[,，。、\n]/).filter(m => m.trim().length > 3);
    if (memoryItems.length > 0) {
      const memory = getRandomItem(memoryItems).trim();
      if (Math.random() > 0.5) {
        response += ` 对了，${memory}。`;
      }
    }
  }
  
  return {
    id: generateId(),
    type: 'ai',
    actorId: actor.id,
    content: response,
    timestamp: Date.now(),
    isFavorite: false,
    isEdited: false,
  };
};

export const getChatSpeedInterval = (speed: ChatSpeed): number => {
  const baseIntervals: Record<ChatSpeed, number> = {
    slow: 4000,
    normal: 2500,
    fast: 1200,
  };
  const base = baseIntervals[speed] || 2500;
  return base + Math.random() * 1000 - 500;
};

export const generateOpeningByTheme = (theme: string, actors: AIActor[]): string => {
  const openings: Record<string, string> = {
    '日常闲聊': `一个阳光明媚的下午，${actors.map(a => a.name).join('、')}聚在一起，开始了今天的闲聊。`,
    '情感讨论': `夜深了，${actors.map(a => a.name).join('、')}围坐在一起，聊起了各自的心事。`,
    '工作讨论': `会议室里，${actors.map(a => a.name).join('、')}正在讨论今天的工作安排。`,
    '学术探讨': `图书馆的角落，${actors.map(a => a.name).join('、')}展开了一场深入的学术讨论。`,
    '创意 brainstorm': `白板前，${actors.map(a => a.name).join('、')}开始了一场头脑风暴。`,
    '角色扮演': `灯光明暗交错，${actors.map(a => a.name).join('、')}即将开始一场特别的角色扮演。`,
  };
  
  return openings[theme] || `${actors.map(a => a.name).join('、')}聚在一起，开始了今天的对话。`;
};

export const exportChatAsText = (messages: ChatMessage[], actors: AIActor[]): string => {
  return messages.map(msg => {
    if (msg.type === 'narration') {
      return `【旁白】${msg.content}`;
    }
    if (msg.type === 'system') {
      return `[系统] ${msg.content}`;
    }
    const actor = actors.find(a => a.id === msg.actorId);
    const name = actor?.name || '未知';
    return `${name}：${msg.content}`;
  }).join('\n\n');
};

export const exportChatAsMarkdown = (messages: ChatMessage[], actors: AIActor[], title: string): string => {
  let md = `# ${title}\n\n`;
  md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `---\n\n`;
  
  messages.forEach(msg => {
    if (msg.type === 'narration') {
      md += `> **旁白**：${msg.content}\n\n`;
    } else if (msg.type === 'system') {
      md += `*[系统] ${msg.content}*\n\n`;
    } else {
      const actor = actors.find(a => a.id === msg.actorId);
      const name = actor?.name || '未知';
      md += `**${name}**：${msg.content}\n\n`;
    }
  });
  
  return md;
};
