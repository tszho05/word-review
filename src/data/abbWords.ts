export const validABBWords = [
  '映入眼簾',
  '洋洋自得',
  '跨步',
  '急性子',
  '循循善誘',
  '溫煦',
  '哺育',
  '茁壯',
  '指指點點',
  '婀娜多姿',
  '唸唸有詞',
  '尤其',
  '纏着',
  '慢悠悠',
  '鋪天蓋地',
  '亂七八糟',
  '妨礙',
  '迴蕩',
  '犧牲',
  '瀟灑',
  '儀表堂堂',
  '昂首闊步',
  '鬆垮',
] as const;

export type ValidABBWord = (typeof validABBWords)[number];

export const maxWordLength = Math.max(...validABBWords.map((word) => [...word].length));
