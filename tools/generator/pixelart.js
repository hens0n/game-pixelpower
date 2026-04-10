export const MILESTONES = {
  11: {
    name: 'Heart',
    description: 'A classic heart shape in red and yellow.',
    layout: [
      [null, 'red', 'red', null, 'red', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red'],
      ['red', 'yellow', 'red', 'red', 'yellow', 'red'],
      ['red', 'red', 'red', 'red', 'red', 'red'],
      [null, 'red', 'red', 'red', 'red', null],
      [null, null, 'red', 'red', null, null],
    ],
  },
  21: {
    name: 'Chick',
    description: 'A fluffy yellow chick with green eyes.',
    layout: [
      [null, null, 'yellow', 'yellow', 'yellow', null, null],
      [null, 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
      ['yellow', 'green', 'yellow', 'yellow', 'yellow', 'green', 'yellow'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      [null, 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
      [null, null, 'yellow', 'red', 'yellow', null, null],
      [null, null, null, 'yellow', null, null, null],
    ],
  },
  31: {
    name: 'Tree',
    description: 'A green tree with a yellow trunk.',
    layout: [
      [null, null, 'green', 'green', 'green', null, null],
      [null, 'green', 'green', 'green', 'green', 'green', null],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green'],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green'],
      [null, 'yellow', 'green', 'green', 'green', 'yellow', null],
      [null, 'yellow', null, null, null, 'yellow', null],
      [null, 'yellow', 'yellow', null, 'yellow', 'yellow', null],
    ],
  },
  41: {
    name: 'Robot',
    description: 'A blue robot with yellow eyes and a red mouth.',
    layout: [
      [null, null, 'blue', 'blue', 'blue', 'blue', null, null],
      [null, 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', null],
      ['blue', 'blue', 'yellow', 'blue', 'blue', 'yellow', 'blue', 'blue'],
      ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
      ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
      [null, 'blue', 'red', 'red', 'red', 'red', 'blue', null],
      [null, null, 'blue', 'blue', 'blue', 'blue', null, null],
      ['blue', 'blue', null, null, null, null, 'blue', 'blue'],
    ],
  },
  50: {
    name: 'Crown',
    description: 'A royal yellow crown with red jewels.',
    layout: [
      [null, 'yellow', null, 'yellow', null, 'yellow', null, null],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      ['yellow', 'red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      [null, 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
      [null, null, 'yellow', 'yellow', 'yellow', 'yellow', null, null],
    ],
  },
};

export function getMilestone(levelNumber) {
  return MILESTONES[levelNumber] || null;
}
