import { test } from '@mobilewright/test';
import { ContactsListScreen } from '../screens/contacts-list.screen';
import { AddContactScreen } from '../screens/add-contact.screen';

test('adds a new contact', async ({ screen }) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.tapAdd();

  const form = new AddContactScreen(screen);
  await form.expectAtAddScreen();
  await form.fillBasics({
    firstName: 'Dhaksh',
    lastName: 'Test',
    company: 'LambdaTest',
  });
  await form.save();

  await list.expectContactInList('Dhaksh Test');
});
