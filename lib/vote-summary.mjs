export const MEH_VOTE=2;
export function voteSummary(up=0,down=0,neutral=0){up=Number(up)||0;down=Number(down)||0;neutral=Number(neutral)||0;const total=up+down+neutral;return {up,down,neutral,total,awesomePercent:total?up/total*100:0,bullshitPercent:total?down/total*100:0}}
