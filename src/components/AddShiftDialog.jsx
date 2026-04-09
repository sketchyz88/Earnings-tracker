import React, { useState, useEffect } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, FormControl, FormLabel, Input, NumberInput, NumberInputField, Select, Textarea, VStack, HStack } from '@chakra-ui/react';
const ce = React.createElement;
const FLOORS = ['Main Floor','Bar','Patio','Private Room','Other'];
const today = () => new Date().toISOString().split('T')[0];
const calcH = (s,e) => { if(!s||!e) return ''; const[sh,sm]=s.split(':').map(Number);const[eh,em]=e.split(':').map(Number);let d=(eh*60+em)-(sh*60+sm);if(d<0)d+=1440;return (d/60).toFixed(2); };
const AddShiftDialog = ({isOpen,onClose,onSave,editingShift}) => {
    const [form,setForm] = useState({date:today(),startTime:'',endTime:'',hours:'',tips:'',earnings:'',floor:'',notes:''});
    useEffect(()=>{
          if(editingShift) setForm({date:editingShift.date||today(),startTime:editingShift.startTime||'',endTime:editingShift.endTime||'',hours:editingShift.hours||'',tips:editingShift.tips||'',earnings:editingShift.earnings||'',floor:editingShift.floor||'',notes:editingShift.notes||''});
          else setForm({date:today(),startTime:'',endTime:'',hours:'',tips:'',earnings:'',floor:'',notes:''});
    },[editingShift,isOpen]);
    const set = (f,v) => setForm(p=>{const u={...p,[f]:v};if(f==='startTime'||f==='endTime'){const h=calcH(u.startTime,u.endTime);if(h)u.hours=h;}return u;});
    const submit = () => { if(!form.date||!form.hours||!form.tips)return; onSave({date:form.date,startTime:form.startTime,endTime:form.endTime,hours:parseFloat(form.hours)||0,tips:parseFloat(form.tips)||0,earnings:parseFloat(form.earnings)||0,floor:form.floor,notes:form.notes}); };
    return ce(Modal,{isOpen,onClose,size:'md'},
                  ce(ModalOverlay),
                  ce(ModalContent,null,
                           ce(ModalHeader,null,editingShift?'Edit Shift':'Add Shift'),
                           ce(ModalCloseButton),
                           ce(ModalBody,null,
                                      ce(VStack,{spacing:3},
                                                   ce(FormControl,{isRequired:true},ce(FormLabel,null,'Date'),ce(Input,{type:'date',value:form.date,onChange:e=>set('date',e.target.value)})),
                                                   ce(HStack,{w:'full'},
                                                                  ce(FormControl,null,ce(FormLabel,null,'Start'),ce(Input,{type:'time',value:form.startTime,onChange:e=>set('startTime',e.target.value)})),
                                                                  ce(FormControl,null,ce(FormLabel,null,'End'),ce(Input,{type:'time',value:form.endTime,onChange:e=>set('endTime',e.target.value)}))
                                                                ),
                                                   ce(FormControl,{isRequired:true},ce(FormLabel,null,'Hours'),ce(NumberInput,{min:0,max:24,value:form.hours,onChange:v=>set('hours',v)},ce(NumberInputField,{placeholder:'e.g. 6.5'}))),
                                                   ce(HStack,{w:'full'},
                                                                  ce(FormControl,{isRequired:true},ce(FormLabel,null,'Tips ($)'),ce(NumberInput,{min:0,value:form.tips,onChange:v=>set('tips',v)},ce(NumberInputField,{placeholder:'0.00'}))),
                                                                  ce(FormControl,null,ce(FormLabel,null,'Earnings ($)'),ce(NumberInput,{min:0,value:form.earnings,onChange:v=>set('earnings',v)},ce(NumberInputField,{placeholder:'0.00'})))
                                                                ),
                                                   ce(FormControl,null,ce(FormLabel,null,'Floor'),ce(Select,{placeholder:'Select floor',value:form.floor,onChange:e=>set('floor',e.target.value)},...FLOORS.map(f=>ce('option',{key:f,value:f},f)))),
                                                   ce(FormControl,null,ce(FormLabel,null,'Notes'),ce(Textarea,{placeholder:'Any notes...',value:form.notes,onChange:e=>set('notes',e.target.value),rows:2}))
                                                 )
                                    ),
                           ce(ModalFooter,null,
                                      ce(Button,{variant:'ghost',mr:3,onClick:onClose},'Cancel'),
                                      ce(Button,{colorScheme:'teal',onClick:submit,isDisabled:!form.date||!form.hours||!form.tips},editingShift?'Save Changes':'Add Shift')
                                    )
                         )
                );
};
export default AddShiftDialog;
