import { defineComponent } from '@shoalrun/cli/components';
export default defineComponent({
  children: 'required',
  content({ children }) { return children; }
});
