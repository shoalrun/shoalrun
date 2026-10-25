import { defineComponent, content } from '@shoalrun/cli/components';
export default defineComponent({
  children: 'none',
  content() {
    return {
      content: content.paragraph('Contact the workspace owner if you need additional permissions.'),
      data: { presentationOnly: 'This browser data must never enter the export.' }
    };
  }
});
