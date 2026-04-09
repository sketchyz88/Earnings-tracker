import React from 'react';
import { Box, Heading, Text, SimpleGrid, Flex, Progress } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
const ce = React.createElement;
function getPeriods(shifts) {
    if(!shifts.length) return [];
    const s=[...shifts].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const res=[]; let i=0;
    while(i<s.length){
          const st=new Date(s[i].date),en=new Date(st); en.setDate(en.getDate()+13);
          const p=s.filter(x=>{const d=new Date(x.date);return d>=st&&d<=en;});
          const h=p.reduce((a,x)=>a+(parseFloat(x.hours)||0),0);
          const t=p.reduce((a,x)=>a+(parseFloat(x.tips)||0),0);
          const e=p.reduce((a,x)=>a+(parseFloat(x.earnings)||0),0);
          res.push({label:st.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+en.toLocaleDateString('en-US',{month:'short',day:'numeric'}),hours:parseFloat(h.toFixed(1)),tips:parseFloat(t.toFixed(2)),earnings:parseFloat(e.toFixed(2)),shifts:p.length});
          i+=p.length; if(!p.length)break;
    }
    return res;
}
const BiWeeklyHours = ({shifts}) => {
    const periods=getPeriods(shifts||[]); const goal=80;
    if(!periods.length) return ce(Box,{textAlign:'center',py:10,color:'gray.500'},ce(Text,null,'No data yet. Add some shifts first!'));
    const cur=periods[periods.length-1]; const pct=Math.min(100,(cur.hours/goal)*100);
    const chart = periods.length>1 ? ce(Box,{bg:'white',rounded:'lg',shadow:'sm',border:'1px',borderColor:'gray.200',p:5},
                                            ce(Heading,{size:'sm',mb:4},'Hours by Pay Period'),
                                            ce(ResponsiveContainer,{width:'100%',height:200},
                                                     ce(BarChart,{data:periods,margin:{top:5,right:20,left:0,bottom:5}},
                                                                ce(CartesianGrid,{strokeDasharray:'3 3'}),
                                                                ce(XAxis,{dataKey:'label',tick:{fontSize:11}}),
                                                                ce(YAxis),
                                                                ce(Tooltip,{formatter:(v)=>[v,'Hours']}),
                                                                ce(Bar,{dataKey:'hours',fill:'#38B2AC',radius:[4,4,0,0]})
                                                              )
                                                   )
                                          ) : null;
    return ce(Box,null,
                  ce(Box,{bg:'white',rounded:'lg',shadow:'sm',border:'1px',borderColor:'gray.200',p:5,mb:4},
                           ce(Heading,{size:'sm',mb:3},'Current Pay Period'),
                           ce(SimpleGrid,{columns:{base:2,md:4},spacing:4,mb:4},
                                      ce(Box,null,ce(Text,{fontSize:'xs',color:'gray.500'},'Hours'),ce(Text,{fontSize:'xl',fontWeight:'bold',color:'teal.600'},cur.hours)),
                                      ce(Box,null,ce(Text,{fontSize:'xs',color:'gray.500'},'Tips'),ce(Text,{fontSize:'xl',fontWeight:'bold',color:'green.600'},'$'+cur.tips)),
                                      ce(Box,null,ce(Text,{fontSize:'xs',color:'gray.500'},'Earnings'),ce(Text,{fontSize:'xl',fontWeight:'bold',color:'blue.600'},'$'+cur.earnings)),
                                      ce(Box,null,ce(Text,{fontSize:'xs',color:'gray.500'},'Shifts'),ce(Text,{fontSize:'xl',fontWeight:'bold'},cur.shifts))
                                    ),
                           ce(Box,null,
                                      ce(Flex,{justify:'space-between',mb:1},ce(Text,{fontSize:'xs',color:'gray.500'},'Hours ('+cur.hours+'/'+goal+')'),ce(Text,{fontSize:'xs',fontWeight:'bold',color:pct>=100?'green.500':'teal.500'},pct.toFixed(0)+'%')),
                                      ce(Progress,{value:pct,colorScheme:pct>=100?'green':'teal',rounded:'full',size:'sm'})
                                    )
                         ),
                  chart
                );
};
export default BiWeeklyHours;
