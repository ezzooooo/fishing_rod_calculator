'use client';

import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

const FieldContext=createContext<{id:string;labelId:string}|null>(null);

export function Button({variant='primary',className='',type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props}/>;
}
export function Input({className='',onFocus,...props}:InputHTMLAttributes<HTMLInputElement>) {
  const field=useContext(FieldContext);
  return <input className={`control ${className}`} {...props} id={props.id??field?.id} aria-labelledby={props['aria-labelledby']??(props['aria-label']?undefined:field?.labelId)} onFocus={event=>{event.currentTarget.select();onFocus?.(event);}}/>;
}
export function Textarea({className='',onFocus,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field=useContext(FieldContext);
  return <textarea className={`control ${className}`} {...props} id={props.id??field?.id} aria-labelledby={props['aria-labelledby']??(props['aria-label']?undefined:field?.labelId)} onFocus={event=>{event.currentTarget.select();onFocus?.(event);}}/>;
}
export function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}) {
  const id=useId();
  const labelId=`${id}-label`;
  let content=children;
  let controlId=id;
  if(isValidElement(children)&&typeof children.type==='string'&&['input','textarea','select'].includes(children.type)){
    const control=children as ReactElement<{id?:string}>;
    controlId=control.props.id??id;
    content=cloneElement(control,{id:controlId});
  }
  return <div className="field"><label id={labelId} htmlFor={controlId} className="field-label">{label}</label><FieldContext.Provider value={{id:controlId,labelId}}>{content}</FieldContext.Provider>{hint&&<span className="field-hint">{hint}</span>}</div>;
}
export function Modal({title,onClose,children,footer,wide=false}:{title:string;onClose?:()=>void;children:ReactNode;footer?:ReactNode;wide?:boolean}) {
  const reference=useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(()=>{const dialog=reference.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={reference} className={`modal ${wide?'modal-wide':''}`} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose?.();}} onClick={event=>{if(event.target===event.currentTarget)onClose?.();}}>
    <div className="modal-frame"><header className="modal-header"><h2 id={titleId}>{title}</h2><Button variant="ghost" aria-label="닫기" disabled={!onClose} onClick={onClose}><X size={20}/></Button></header><div className="modal-body">{children}</div>{footer&&<footer className="modal-footer">{footer}</footer>}</div>
  </dialog>;
}
export function PageHeading({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <header className="page-heading"><div><p className="eyebrow">FISHJOONGO / STAFF WORKSPACE</p><h1>{title}</h1>{description&&<p className="page-description">{description}</p>}</div>{action&&<div className="page-action">{action}</div>}</header>;
}
export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <div className="empty-state"><div className="empty-symbol" aria-hidden="true">＋</div><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>;
}
