const { select } = require('./index');

select({
  text: 'Select:',
  options: [ 'One', 'Two', 'Three' ],
})
  .then(value => console.log('You selected: ' + value));
