import { defineComponent, content } from '@shoalrun/cli/components';
export default defineComponent({
  attributes: { title: { type: 'string', required: true } },
  children: 'required',
  content({ attributes, children }) {
    return content.component('Tabs', { label: attributes.title }, [children]);
  }
});
