import * as T from './vendor/three.module.js';

// These short passages are original narration. Only `poem` entries quote Su Shi.
const scripts=[
 {intro:'1079年，苏轼到湖州任职。书案铺好，窗外有光；他以为这次能安稳做些事。',events:{lantern:{prose:'窗扇打开，光照到案上。这里写下的，是一封谢恩的表文。'},paper:{prose:'表文送出去了。里面几句话被指为讥讽朝廷，旧诗也接着被翻了出来。刚安顿好的日子，突然停了。'}}},
 {intro:'同年，他被押往御史台。诗稿成了罪证，来时的门在身后合上。',events:{enclosed:{prose:'门落下了。先前还能回头的路，如今只剩门板。'},'seal-left':{prose:'推开一扇格门。旧诗中的一句话，又被拿来追问。'},'seal-right':{prose:'另一边也是门。开得越多，越知道这里没有自己能选的出口。'},gate:{prose:'正门开向更深的院子。脚步还得往前，人却不知道会被带到哪里。'}}},
 {intro:'狱里，他不知道还能不能见到家人。先开高窗，让一点月光照到纸上。',events:{window:{prose:'月光进来了，铁栅还在。他想给弟弟子由留句话，也想到了妻儿。'},letter:{prose:'诗写好了。年底他终于获释，性命保住了，却被贬往黄州。',poem:'梦绕云山心似鹿，魂飞汤火命如鸡'}}},
 {intro:'1080年到了黄州，他连日子怎么过都要重新学。后来开垦东坡、筑起雪堂。门前积水，屋顶漏雨。两条渠去向不同；先看水往哪里走，排干之后再接梁、补檐。',events:{'sluice-no-route':{prose:'闸是开了，水却没有出去。开一道门，还得知道它通向哪里。',thought:'门开了也不算有路。先看看这水，为什么还绕回来。'},'sluice-return':{prose:'水顺着弯渠又流回门前。石路仍淹着，屋里的活还动不了手。',thought:'又回到原处了。换一条去处，再试一回。'},'sluice-directed':{prose:'这条渠向低处的田埂走，积水终于离开院子。',thought:'朝廷给的路走不通了，眼前这条路，总还能自己疏出来。'},'repair-beam':{prose:'石路露出来，散落的木料也能用上了。先把断梁接住，屋面才有地方落。',thought:'先站稳。没有梁，再好的屋面也搁不住。'},'repair-cover':{prose:'梁接上了，缺口却还在漏雨。沿着屋面的边，把这一片补齐。',thought:'这一处可以补，就先补这一处。今晚得有个不漏雨的地方。'},sluice:{prose:'渠闸打开，水沿着渠流走了。石路和能用的木料露出来了。水排出去，屋顶还是坏的，接下来得亲手接梁、补檐。'},boat:{prose:'梁接稳，屋面合上，漏雨停了。现在窗和门才打开，屋里亮起一盏灯。',thought:'终于有个地方，能把纸放下，坐一会儿了。'},dock:{prose:'走进屋里，桌上又有了纸。朝廷里的苏轼暂时远了，在这里种地、过日子的东坡开始了。'}}},
 {intro:'1082年，沙湖道中遇雨，雨具却先被带走了。这次，没有人替他开路。',events:{wind:{prose:'格屏迎着风打开。檐外都是雨，前面的路没有干的。'},rain:{prose:'屋檐只能遮住这一小段。再走几步，就要把脚踩进雨里。'},path:{prose:'他走了出去。雨还在下，脚步却没有再急起来。',poem:'一蓑烟雨任平生'}}},
 {intro:'1082年七月，赤壁月夜。先点窗闩见月，再停笔听箫。最后沿廊找一个能同时看见月亮和倒影的位置，把水月之间的墨线描通。',events:{'water-moon-blocked':{prose:'梁枨挡住了半边月，水中倒影也断开了。站在这里，看到的仍是被分开的天地。',thought:'我总想着抓住一点什么，可水和月，哪里留得住。'},'water-moon-aligned':{prose:'再挪几步，窗中的月和江上的倒影接到了一起。窗没变，眼前却不一样了。',thought:'它们一直都在。也许该换的，是我站的位置。'},moon:{prose:'窗扇开了，月光落进廊里。终于能把目光从自己的遭遇里移开一会儿。',thought:'只看眼前这一江月，倒也可以把那些事放一放。',poem:'白露横江，水光接天'},listen:{prose:'箫声传来，刚才的松快又沉了下去。他想到自己的得失，也想到那些早已不在的人。',thought:'人只在这里一小会儿，江水却一直往前。我的这点得失，究竟算什么。',poem:'哀吾生之须臾，羡长江之无穷'},water:{prose:'墨线接通，遮景屏展开，江台也伸向月光里。水还在流，月亮仍在；眼前的天地，不再只有自己的难处。',thought:'留不住，就不必攥着了。这阵风、这轮月，眼下都在。',poem:'惟江上之清风，与山间之明月'}},sourceNote:'本章依《前赤壁赋》乐、悲、释然的行文设计；格窗与遮景屏是游戏中的空间演绎，原文发生在舟上。'},
 {intro:'1084年离开黄州，途中游庐山。先别急着下结论，换一扇窗，再看一次。',events:{mountain:{prose:'这扇窗里，山是一道长岭。沿着转角往前，还有另一处能看山的地方。',poem:'横看成岭'},'mountain-rear':{prose:'同一座山，在这里成了高峰。刚才看见的是真的，却不是它的全部。',poem:'侧成峰'}}},
 {intro:'1085年，苏轼重新被起用。正殿就在水院另一端，廊桥却偏向雾里。走到桥头，按住屏幕落墨；等墨波进入浅色水纹带，恰好松笔，才能让廊桥转正；过早或过晚都要再试。',events:{'turn-near':{prose:'墨波与水纹相合，廊桥缓缓转正。木梁落稳，栏门让开。沿接好的桥走进正殿，让高窗的光照到案上诏卷。',thought:'原以为再也回不去了。如今，脚下又有了一条路。'},'read-decree':{prose:'九年之后，绍圣元年（1094）。再贬的消息到了。暖光冷下来，来时的廊门合上；东廊桥仍偏向另一岸。',thought:'来路不能走了。总还要找到另一条。'},banishment:{prose:'九年之后 · 1094。苏轼被贬往惠州。走到东廊桥头，按住屏幕，让墨波再次荡开；在浅色水纹带里松笔，把南行的路接下去。',thought:'路还没有到岸，得亲手把这一段接下去。'},'turn-far':{prose:'墨色洇开，东廊桥转向对岸，木梁稳稳落下。两端栏门让开，南行的门就在桥尽头。',thought:'不能回头，仍可以接住眼前这一段路。'},gate:{prose:'跨过南门，走向惠州。几番起落之后，他还要把日子过下去。'}},sourceNote:'旋转廊桥与借墨定桥为游戏中的诗意建筑演绎。起用卷为史事节述，非官诏原文；1085年召还，1086年入翰林，1094年贬惠州。'},
 {intro:'1094年，他被贬到惠州。处境又坏了，日子却不肯只剩苦味。走过荔枝雨，把最后一颗涂红。',events:{paint:{prose:'最后一颗红了。回过身，眼前都是荔枝。这一次，先让他痛快高兴一回。',poem:'日啖荔枝三百颗，不辞长作岭南人'}},sourceNote:'荔枝诗表现惠州生活中的旷达；《艇斋诗话》所记章惇读诗后再贬的故事，对应“春睡”诗，不能写成荔枝诗直接导致再贬。相关记闻与《纵笔》的篇题和首句存在异文。'},
 {intro:'1097年，又被贬到海那边的儋州。1100年获赦北归，次年经过金山，他看见了自己的画像。',events:{sit:{prose:'坐下来，再看自己这一生。黄州、惠州、儋州——曾经不想去的地方，都在里面。'},home:{prose:'许多年前，他把柔奴的一句答话写进词里：此心安处是吾乡。走过这一路，再读它，已经是另一种心情。'}},sourceNote:'收尾接入《定风波·南海归赠王定国侍人寓娘》中柔奴的答话，作为诗意回望，并非苏轼临终遗言。'},
 // Ending borrows an earlier lyric: Rou-nu's reply in 南海归赠王定国侍人寓娘.
 // It is deliberately NOT presented as Su Shi's last words in 1101.
 {intro:'1101年，北归的路快走完了。走过那么远的地方，也终于有了可以安放心的地方。',events:{},sourceNote:'此心安处是吾乡出自《定风波·南海归赠王定国侍人寓娘》，原词是柔奴的答话，并非苏轼临终遗言。'},
 {intro:'1083年十月十二日夜。解衣欲睡，月色已经悄悄来到窗外。',events:{'moon-window':{prose:'窗扇迎月打开，廊下的石路亮了。他想起还未睡下的怀民。',poem:'月色入户，欣然起行'},'moon-gallery':{prose:'隔着窗格，散开的墨影慢慢合成一个人。灯还亮着，怀民也没有睡。',poem:'怀民亦未寝'},'friend-door':{prose:'怀民应声而来，两人穿过门槛，一道走向中庭。月色落在青石上，交横的暗纹像水中藻荇。',poem:'相与步于中庭'},'court-moon':{prose:'一笔月色沿石砖铺开，交横的暗纹渐渐清楚。抬眼看去，原来是竹柏的影。回到书案，把这一夜记下来。',thought:'何夜无月？何处无竹柏？今晚，有人一起慢慢看。',poem:'庭下如积水空明，水中藻荇交横，盖竹柏影也'},study:{prose:'这一夜落在纸上。许多月亮都曾照过这里，今夜却被他们看见了。',poem:'但少闲人如吾两人者耳'}},sourceNote:'依苏轼《记承天寺夜游》作诗意建筑演绎，非承天寺史实复原；外篇回到1083年黄州。'},
 {intro:'行旅之后，再回到诗中。点一块活字，重读山、江与湖。',events:{}}
];

export function decorateStory(stage,index){
 const script=scripts[index]||{intro:'',events:{}},seen=new Set();
 const originalReset=stage.reset;
 stage.narrative={intro:script.intro,sourceNote:script.sourceNote||'',event(id){if(seen.has(id))return null;seen.add(id);return script.events[id]||{prose:'',poem:''};}};
 stage.reset=function(...args){seen.clear();return originalReset?.apply(stage,args);};
 if(index!==1)return stage;

 // A gate closes behind the visitor once they enter the U-tai courtyard.
 const entry=new T.Group();entry.name='入院后合拢的乌台门';entry.position.set(0,0,5.6);stage.scene.add(entry);
 const wood=new T.MeshStandardMaterial({color:0x566055,roughness:.94}),stone=new T.MeshStandardMaterial({color:0x7c8578,roughness:1});
 const box=(w,h,d,x,y,z,parent,m=wood)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 for(const side of [-1,1]){box(.22,3.3,.25,side*2,1.65,0,entry);box(.50,.21,.48,side*2,.09,0,entry,stone);}box(4.25,.20,.25,0,3.27,0,entry);
 const leaves=[];for(const side of [-1,1]){const hinge=new T.Group();hinge.position.x=side*1.9;entry.add(hinge);box(1.9,2.8,.14,-side*.95,1.40,0,hinge);for(const y of [.45,2.32])box(1.88,.15,.19,-side*.95,y,.035,hinge);leaves.push({hinge,side});}
 let shutting=false,openness=1,last=null,event=null;
 function pose(){for(const {hinge,side}of leaves)hinge.rotation.y=side*openness*1.43;}
 const resetWithStory=stage.reset;
 stage.reset=function(...args){shutting=false;openness=1;last=null;event=null;pose();return resetWithStory.apply(stage,args);};
 stage.updateStory=function(time,player){const dt=last===null?0:Math.min(.05,Math.max(0,time-last));last=time;if(!shutting&&player.z<4.45){shutting=true;event='enclosed';}if(shutting)openness=Math.max(0,openness-dt/2.2);pose();};
 stage.takeStoryEvent=()=>{const result=event;event=null;return result;};
 const priorCanMove=stage.canMove;
 stage.canMove=(from,to,done)=>!(shutting&&openness<.18&&from.z<5.25&&to.z>5.25)&&priorCanMove?.(from,to,done)!==false;
 Object.defineProperty(stage,'entryGateOpening',{get:()=>openness});
 pose();return stage;
}
