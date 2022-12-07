import $ from '..'

export interface IMyMixin extends $.Element<IMyMixin> { }

export const myMixin = () => $.mixin((superclass): $.Class<IMyMixin> => {
  interface MyMixin extends $.Element<MyMixin> { }
  @$.element()
  class MyMixin extends superclass { }
  return MyMixin
})
