// Su Shi's public-domain originals, checked against the linked text editions.
export const PROLOGUE_POEMS=Object.freeze([
 Object.freeze({id:'xilin',title:'题西林壁',author:'苏轼',lines:Object.freeze(['横看成岭侧成峰','远近高低各不同','不识庐山真面目','只缘身在此山中']),source:'https://zh.wikisource.org/zh-hans/題西林壁',word:'山'}),
 Object.freeze({id:'spring-river',title:'惠崇春江晚景·其一',author:'苏轼',lines:Object.freeze(['竹外桃花三两枝','春江水暖鸭先知','蒌蒿满地芦芽短','正是河豚欲上时']),source:'https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/resources/primary/lang/jilei_shi_pdf/jilei_shi_080.pdf',word:'江'}),
 Object.freeze({id:'west-lake',title:'饮湖上初晴后雨·其二',author:'苏轼',lines:Object.freeze(['水光潋滟晴方好','山色空蒙雨亦奇','欲把西湖比西子','淡妆浓抹总相宜']),source:'https://zh.wikisource.org/zh-hans/飲湖上初晴後雨',word:'湖'})
]);

export function prologuePoemEvent(poem){
 return {id:poem.id,title:poem.title,author:poem.author,lines:poem.lines.slice(),text:poem.lines.map((line,i)=>line+(i%2?'。':'，')).join(''),parts:[poem.lines[0]+'，'+poem.lines[1]+'。',poem.lines[2]+'，'+poem.lines[3]+'。'],source:poem.source,left:true};
}
