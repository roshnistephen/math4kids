window.WORLD_DATA = {
    animal: {
        id: 'animal',
        title: 'Animal World Adventure',
        eyebrow: 'Animal world',
        subtitle: 'Meet furry, feathered, and farm friends.',
        mascot: '🦁',
        message: 'Tap a trail to meet animals, hear sounds, and learn baby animal families.',
        badge: 'Animal Explorer',
        activities: [
            {
                id: 'animal-identify',
                navLabel: 'Find animals',
                title: 'Who is hiding?',
                helper: 'Tap the animal that matches the clue.',
                badge: 'Animal Spotter',
                type: 'choice',
                questions: [
                    {
                        art: '🦒🌿☀️',
                        prompt: 'Which animal has a long neck?',
                        options: [
                            { value: 'lion', icon: '🦁', label: 'Lion' },
                            { value: 'giraffe', icon: '🦒', label: 'Giraffe' },
                            { value: 'pig', icon: '🐷', label: 'Pig' }
                        ],
                        answer: 'giraffe',
                        success: 'Yes! The giraffe stretches up high for leaves.'
                    },
                    {
                        art: '🌊🐬💦',
                        prompt: 'Which animal swims in the sea?',
                        options: [
                            { value: 'dolphin', icon: '🐬', label: 'Dolphin' },
                            { value: 'rabbit', icon: '🐰', label: 'Rabbit' },
                            { value: 'cow', icon: '🐮', label: 'Cow' }
                        ],
                        answer: 'dolphin',
                        success: 'Splish splash! Dolphins love the ocean.'
                    },
                    {
                        art: '🌙🦉🌳',
                        prompt: 'Which animal says hoot at night?',
                        options: [
                            { value: 'owl', icon: '🦉', label: 'Owl' },
                            { value: 'duck', icon: '🦆', label: 'Duck' },
                            { value: 'horse', icon: '🐴', label: 'Horse' }
                        ],
                        answer: 'owl',
                        success: 'Hoot hoot! Owls wake up when the moon comes out.'
                    }
                ]
            },
            {
                id: 'animal-sounds',
                navLabel: 'Animal sounds',
                title: 'Who makes that sound?',
                helper: 'Listen with your eyes and pick the animal sound match.',
                badge: 'Sound Matcher',
                type: 'choice',
                questions: [
                    {
                        art: 'Moo! Moo!',
                        prompt: 'Who says moo?',
                        options: [
                            { value: 'cow', icon: '🐮', label: 'Cow' },
                            { value: 'cat', icon: '🐱', label: 'Cat' },
                            { value: 'frog', icon: '🐸', label: 'Frog' }
                        ],
                        answer: 'cow',
                        success: 'Moo-tastic! Cows say moo.'
                    },
                    {
                        art: 'Quack! Quack!',
                        prompt: 'Who says quack?',
                        options: [
                            { value: 'duck', icon: '🦆', label: 'Duck' },
                            { value: 'dog', icon: '🐶', label: 'Dog' },
                            { value: 'bee', icon: '🐝', label: 'Bee' }
                        ],
                        answer: 'duck',
                        success: 'Quack quack! The duck found the pond.'
                    },
                    {
                        art: 'Buzzzz!',
                        prompt: 'Who makes a buzzing sound?',
                        options: [
                            { value: 'bee', icon: '🐝', label: 'Bee' },
                            { value: 'sheep', icon: '🐑', label: 'Sheep' },
                            { value: 'fish', icon: '🐠', label: 'Fish' }
                        ],
                        answer: 'bee',
                        success: 'Bzzzz! The bee is flying to flowers.'
                    }
                ]
            },
            {
                id: 'animal-families',
                navLabel: 'Animal families',
                title: 'Match the baby animal',
                helper: 'Pick the baby that belongs to the family.',
                badge: 'Family Friend',
                type: 'choice',
                questions: [
                    {
                        art: '🐶 + ?',
                        prompt: 'What is a baby dog called?',
                        options: [
                            { value: 'kitten', icon: '🐱', label: 'Kitten' },
                            { value: 'puppy', icon: '🐶', label: 'Puppy' },
                            { value: 'calf', icon: '🐮', label: 'Calf' }
                        ],
                        answer: 'puppy',
                        success: 'That’s right! A baby dog is a puppy.'
                    },
                    {
                        art: '🐑 + ?',
                        prompt: 'What is a baby sheep called?',
                        options: [
                            { value: 'lamb', icon: '🐑', label: 'Lamb' },
                            { value: 'duckling', icon: '🦆', label: 'Duckling' },
                            { value: 'cub', icon: '🦁', label: 'Cub' }
                        ],
                        answer: 'lamb',
                        success: 'Soft and fluffy! A baby sheep is a lamb.'
                    },
                    {
                        art: '🐔 + ?',
                        prompt: 'What is a baby chicken called?',
                        options: [
                            { value: 'piglet', icon: '🐷', label: 'Piglet' },
                            { value: 'chick', icon: '🐥', label: 'Chick' },
                            { value: 'foal', icon: '🐴', label: 'Foal' }
                        ],
                        answer: 'chick',
                        success: 'Cheep cheep! A baby chicken is a chick.'
                    }
                ]
            }
        ]
    },
    number: {
        id: 'number',
        title: 'Number Fun World',
        eyebrow: 'Number world',
        subtitle: 'Count, pop, and solve tiny number puzzles.',
        mascot: '🎈',
        message: 'Let’s count objects, pop balloons, and fill number gaps with happy number play.',
        badge: 'Number Hero',
        activities: [
            {
                id: 'counting-quest',
                navLabel: 'Count objects',
                title: 'How many can you see?',
                helper: 'Count the objects and tap the right number.',
                badge: 'Counting Star',
                type: 'choice',
                questions: [
                    {
                        art: '🍎🍎🍎',
                        prompt: 'How many apples do you see?',
                        options: [
                            { value: '2', icon: '2️⃣', label: '2' },
                            { value: '3', icon: '3️⃣', label: '3' },
                            { value: '4', icon: '4️⃣', label: '4' }
                        ],
                        answer: '3',
                        success: 'You counted 3 apples. Crunch crunch!'
                    },
                    {
                        art: '🚗🚗🚗🚗',
                        prompt: 'How many cars are here?',
                        options: [
                            { value: '4', icon: '4️⃣', label: '4' },
                            { value: '5', icon: '5️⃣', label: '5' },
                            { value: '6', icon: '6️⃣', label: '6' }
                        ],
                        answer: '4',
                        success: 'Zoom! You spotted 4 cars.'
                    },
                    {
                        art: '⭐⭐⭐⭐⭐',
                        prompt: 'How many stars are shining?',
                        options: [
                            { value: '3', icon: '3️⃣', label: '3' },
                            { value: '5', icon: '5️⃣', label: '5' },
                            { value: '7', icon: '7️⃣', label: '7' }
                        ],
                        answer: '5',
                        success: 'Sparkly counting! There are 5 stars.'
                    }
                ]
            },
            {
                id: 'number-match',
                navLabel: 'Match numbers',
                title: 'Number and picture match',
                helper: 'Pick the card with the matching number.',
                badge: 'Number Matcher',
                type: 'choice',
                questions: [
                    {
                        art: '🍪🍪',
                        prompt: 'Which number matches 2 cookies?',
                        options: [
                            { value: '1', icon: '1️⃣', label: '1' },
                            { value: '2', icon: '2️⃣', label: '2' },
                            { value: '4', icon: '4️⃣', label: '4' }
                        ],
                        answer: '2',
                        success: 'Yum! 2 cookies match number 2.'
                    },
                    {
                        art: '🎁🎁🎁🎁',
                        prompt: 'Which number matches 4 gifts?',
                        options: [
                            { value: '3', icon: '3️⃣', label: '3' },
                            { value: '4', icon: '4️⃣', label: '4' },
                            { value: '5', icon: '5️⃣', label: '5' }
                        ],
                        answer: '4',
                        success: 'Hooray! 4 gifts match number 4.'
                    },
                    {
                        art: '🧸🧸🧸',
                        prompt: 'Which number matches 3 bears?',
                        options: [
                            { value: '2', icon: '2️⃣', label: '2' },
                            { value: '3', icon: '3️⃣', label: '3' },
                            { value: '6', icon: '6️⃣', label: '6' }
                        ],
                        answer: '3',
                        success: 'You matched 3 teddy bears perfectly.'
                    }
                ]
            },
            {
                id: 'balloon-pop',
                navLabel: 'Pop balloons',
                title: 'Pop the right balloon',
                helper: 'Find the target number and pop it.',
                badge: 'Balloon Popper',
                type: 'balloon',
                questions: [
                    {
                        art: '🎈',
                        prompt: 'Pop balloon number 6.',
                        options: [
                            { value: '4', label: '4' },
                            { value: '6', label: '6' },
                            { value: '8', label: '8' }
                        ],
                        answer: '6',
                        success: 'Pop! You found balloon 6.'
                    },
                    {
                        art: '🎈',
                        prompt: 'Pop balloon number 3.',
                        options: [
                            { value: '1', label: '1' },
                            { value: '3', label: '3' },
                            { value: '5', label: '5' }
                        ],
                        answer: '3',
                        success: 'Pop! Balloon 3 floated away.'
                    },
                    {
                        art: '🎈',
                        prompt: 'Pop balloon number 9.',
                        options: [
                            { value: '7', label: '7' },
                            { value: '8', label: '8' },
                            { value: '9', label: '9' }
                        ],
                        answer: '9',
                        success: 'Wonderful! You popped balloon 9.'
                    }
                ]
            },
            {
                id: 'picnic-count',
                navLabel: 'Pack & count',
                title: 'Pack the picnic basket',
                helper: 'Tap items into the basket until the count is just right.',
                badge: 'Picnic Packer',
                type: 'collector',
                questions: [
                    {
                        art: '🧺',
                        prompt: 'Pack 4 apples into the picnic basket.',
                        item: '🍎',
                        target: 4,
                        pool: 7,
                        success: 'Your basket has exactly 4 apples.'
                    },
                    {
                        art: '🧺',
                        prompt: 'Pack 5 flowers into the basket.',
                        item: '🌼',
                        target: 5,
                        pool: 8,
                        success: 'Sweet! You packed 5 flowers.'
                    },
                    {
                        art: '🧺',
                        prompt: 'Pack 3 stars into the basket.',
                        item: '⭐',
                        target: 3,
                        pool: 6,
                        success: 'Shiny counting! You packed 3 stars.'
                    }
                ]
            },
            {
                id: 'missing-number',
                navLabel: 'Missing numbers',
                title: 'Which number is missing?',
                helper: 'Look at the line and fill the gap.',
                badge: 'Puzzle Solver',
                type: 'choice',
                questions: [
                    {
                        art: '1 · 2 · _ · 4',
                        prompt: 'What number comes in the empty spot?',
                        options: [
                            { value: '3', icon: '3️⃣', label: '3' },
                            { value: '5', icon: '5️⃣', label: '5' },
                            { value: '6', icon: '6️⃣', label: '6' }
                        ],
                        answer: '3',
                        success: 'Yes! 3 fits right in the middle.'
                    },
                    {
                        art: '5 · _ · 7',
                        prompt: 'What number is missing?',
                        options: [
                            { value: '4', icon: '4️⃣', label: '4' },
                            { value: '6', icon: '6️⃣', label: '6' },
                            { value: '8', icon: '8️⃣', label: '8' }
                        ],
                        answer: '6',
                        success: 'Correct! 6 comes after 5.'
                    },
                    {
                        art: '_ · 9 · 10',
                        prompt: 'What comes before 9?',
                        options: [
                            { value: '7', icon: '7️⃣', label: '7' },
                            { value: '8', icon: '8️⃣', label: '8' },
                            { value: '6', icon: '6️⃣', label: '6' }
                        ],
                        answer: '8',
                        success: 'Brilliant! 8 comes right before 9.'
                    }
                ]
            }
        ]
    },
    alphabet: {
        id: 'alphabet',
        title: 'Alphabet Adventure',
        eyebrow: 'Alphabet world',
        subtitle: 'Letters, sounds, and object matching fun.',
        mascot: '🔤',
        message: 'Let’s learn letters with big cards, early phonics, and playful picture clues.',
        badge: 'Alphabet Hero',
        activities: [
            {
                id: 'letter-recognition',
                navLabel: 'Find letters',
                title: 'Tap the right letter',
                helper: 'Look at the clue and pick the letter.',
                badge: 'Letter Finder',
                type: 'choice',
                questions: [
                    {
                        art: 'B b',
                        prompt: 'Tap the letter B.',
                        options: [
                            { value: 'A', icon: '🅰️', label: 'A' },
                            { value: 'B', icon: '🅱️', label: 'B' },
                            { value: 'D', icon: '🔠', label: 'D' }
                        ],
                        answer: 'B',
                        success: 'Yes! You found the letter B.'
                    },
                    {
                        art: 'm M',
                        prompt: 'Tap the letter M.',
                        options: [
                            { value: 'M', icon: 'Ⓜ️', label: 'M' },
                            { value: 'N', icon: '🔠', label: 'N' },
                            { value: 'W', icon: '🔠', label: 'W' }
                        ],
                        answer: 'M',
                        success: 'Marvelous! That is letter M.'
                    },
                    {
                        art: 's S',
                        prompt: 'Tap the letter S.',
                        options: [
                            { value: 'C', icon: '🔠', label: 'C' },
                            { value: 'S', icon: '🔠', label: 'S' },
                            { value: 'T', icon: '🔠', label: 'T' }
                        ],
                        answer: 'S',
                        success: 'Super! S is the right letter.'
                    }
                ]
            },
            {
                id: 'phonics-play',
                navLabel: 'Beginning sounds',
                title: 'Which word starts the same?',
                helper: 'Match the sound with the picture word.',
                badge: 'Phonics Friend',
                type: 'choice',
                questions: [
                    {
                        art: 'M says mmm',
                        prompt: 'Which word starts with the /m/ sound?',
                        options: [
                            { value: 'moon', icon: '🌙', label: 'Moon' },
                            { value: 'sun', icon: '☀️', label: 'Sun' },
                            { value: 'dog', icon: '🐶', label: 'Dog' }
                        ],
                        answer: 'moon',
                        success: 'Moon begins with /m/.'
                    },
                    {
                        art: 'S says sss',
                        prompt: 'Which word starts with the /s/ sound?',
                        options: [
                            { value: 'apple', icon: '🍎', label: 'Apple' },
                            { value: 'sock', icon: '🧦', label: 'Sock' },
                            { value: 'bee', icon: '🐝', label: 'Bee' }
                        ],
                        answer: 'sock',
                        success: 'Sock starts with the /s/ sound.'
                    },
                    {
                        art: 'B says buh',
                        prompt: 'Which word starts with the /b/ sound?',
                        options: [
                            { value: 'ball', icon: '⚽', label: 'Ball' },
                            { value: 'leaf', icon: '🍃', label: 'Leaf' },
                            { value: 'fish', icon: '🐟', label: 'Fish' }
                        ],
                        answer: 'ball',
                        success: 'Ball starts with B. Bounce bounce!'
                    }
                ]
            },
            {
                id: 'letter-object-match',
                navLabel: 'Letter + picture',
                title: 'Match the letter with the picture',
                helper: 'Find the object that matches the letter clue.',
                badge: 'Picture Matcher',
                type: 'choice',
                questions: [
                    {
                        art: 'A is for…',
                        prompt: 'Which picture matches letter A?',
                        options: [
                            { value: 'apple', icon: '🍎', label: 'Apple' },
                            { value: 'turtle', icon: '🐢', label: 'Turtle' },
                            { value: 'moon', icon: '🌙', label: 'Moon' }
                        ],
                        answer: 'apple',
                        success: 'Apple starts with A.'
                    },
                    {
                        art: 'C is for…',
                        prompt: 'Which picture matches letter C?',
                        options: [
                            { value: 'dog', icon: '🐶', label: 'Dog' },
                            { value: 'cat', icon: '🐱', label: 'Cat' },
                            { value: 'sun', icon: '☀️', label: 'Sun' }
                        ],
                        answer: 'cat',
                        success: 'Cat starts with C. Meow!'
                    },
                    {
                        art: 'T is for…',
                        prompt: 'Which picture matches letter T?',
                        options: [
                            { value: 'train', icon: '🚂', label: 'Train' },
                            { value: 'bee', icon: '🐝', label: 'Bee' },
                            { value: 'cake', icon: '🎂', label: 'Cake' }
                        ],
                        answer: 'train',
                        success: 'Terrific! Train starts with T.'
                    }
                ]
            }
        ]
    },
    shape: {
        id: 'shape',
        title: 'Shape & Color Explorer',
        eyebrow: 'Shape and color world',
        subtitle: 'Sort colors, spot shapes, and pick visual clues.',
        mascot: '🌈',
        message: 'Use your eyes to find colors, shapes, and the object that fits the clue.',
        badge: 'Shape Explorer',
        activities: [
            {
                id: 'color-match',
                navLabel: 'Color match',
                title: 'Find the color',
                helper: 'Tap the color card that matches the clue.',
                badge: 'Color Catcher',
                type: 'choice',
                questions: [
                    {
                        art: '🔴',
                        prompt: 'Tap the red card.',
                        options: [
                            { value: 'red', icon: '🍎', label: 'Red' },
                            { value: 'blue', icon: '🫐', label: 'Blue' },
                            { value: 'green', icon: '🥝', label: 'Green' }
                        ],
                        answer: 'red',
                        success: 'You found red. Bright and bold!'
                    },
                    {
                        art: '🟡',
                        prompt: 'Tap the yellow card.',
                        options: [
                            { value: 'pink', icon: '🩷', label: 'Pink' },
                            { value: 'yellow', icon: '🍋', label: 'Yellow' },
                            { value: 'purple', icon: '🍇', label: 'Purple' }
                        ],
                        answer: 'yellow',
                        success: 'Sunny yellow shines bright.'
                    },
                    {
                        art: '🔵',
                        prompt: 'Tap the blue card.',
                        options: [
                            { value: 'orange', icon: '🍊', label: 'Orange' },
                            { value: 'blue', icon: '🐳', label: 'Blue' },
                            { value: 'green', icon: '🐸', label: 'Green' }
                        ],
                        answer: 'blue',
                        success: 'Splash! Blue was the right choice.'
                    }
                ]
            },
            {
                id: 'shape-sort',
                navLabel: 'Shape sort',
                title: 'Which shape is it?',
                helper: 'Find the matching shape card.',
                badge: 'Shape Sorter',
                type: 'choice',
                questions: [
                    {
                        art: '⚪',
                        prompt: 'Which shape is a circle?',
                        options: [
                            { value: 'circle', icon: '⚪', label: 'Circle' },
                            { value: 'square', icon: '🟥', label: 'Square' },
                            { value: 'triangle', icon: '🔺', label: 'Triangle' }
                        ],
                        answer: 'circle',
                        success: 'Round and round — that is a circle.'
                    },
                    {
                        art: '🟥',
                        prompt: 'Which shape is a square?',
                        options: [
                            { value: 'oval', icon: '🥚', label: 'Oval' },
                            { value: 'square', icon: '🟥', label: 'Square' },
                            { value: 'star', icon: '⭐', label: 'Star' }
                        ],
                        answer: 'square',
                        success: 'Nice! The square has four equal sides.'
                    },
                    {
                        art: '🔺',
                        prompt: 'Which shape is a triangle?',
                        options: [
                            { value: 'triangle', icon: '🔺', label: 'Triangle' },
                            { value: 'heart', icon: '💜', label: 'Heart' },
                            { value: 'circle', icon: '⚪', label: 'Circle' }
                        ],
                        answer: 'triangle',
                        success: 'Three sides make a triangle.'
                    }
                ]
            },
            {
                id: 'visual-clues',
                navLabel: 'Visual clues',
                title: 'Pick the object that fits',
                helper: 'Use the color and shape clue together.',
                badge: 'Visual Detective',
                type: 'choice',
                questions: [
                    {
                        art: 'Find the yellow star',
                        prompt: 'Which object is a yellow star?',
                        options: [
                            { value: 'yellow-star', icon: '⭐', label: 'Yellow star' },
                            { value: 'red-heart', icon: '❤️', label: 'Red heart' },
                            { value: 'blue-circle', icon: '🔵', label: 'Blue circle' }
                        ],
                        answer: 'yellow-star',
                        success: 'Twinkle! You found the yellow star.'
                    },
                    {
                        art: 'Find the blue square',
                        prompt: 'Which object is a blue square?',
                        options: [
                            { value: 'green-leaf', icon: '🍃', label: 'Green leaf' },
                            { value: 'blue-square', icon: '🟦', label: 'Blue square' },
                            { value: 'orange-ball', icon: '🟠', label: 'Orange ball' }
                        ],
                        answer: 'blue-square',
                        success: 'Fantastic! Blue square found.'
                    },
                    {
                        art: 'Find the red heart',
                        prompt: 'Which object is a red heart?',
                        options: [
                            { value: 'red-heart', icon: '❤️', label: 'Red heart' },
                            { value: 'purple-star', icon: '💜', label: 'Purple shape' },
                            { value: 'yellow-square', icon: '🟨', label: 'Yellow square' }
                        ],
                        answer: 'red-heart',
                        success: 'Love it! That was the red heart.'
                    }
                ]
            }
        ]
    },
    memory: {
        id: 'memory',
        title: 'Memory & Brain Games',
        eyebrow: 'Memory world',
        subtitle: 'Find pairs, spot patterns, and sharpen observation skills.',
        mascot: '🧠',
        message: 'Use your brain power to flip pairs, notice clues, and solve tiny puzzles.',
        badge: 'Brain Builder',
        activities: [
            {
                id: 'picture-pairs',
                navLabel: 'Find pairs',
                title: 'Flip and match',
                helper: 'Open two cards to find a matching pair.',
                badge: 'Memory Match',
                type: 'memory',
                pairs: ['🐸', '🌼', '🚀', '🍎']
            },
            {
                id: 'same-picture',
                navLabel: 'Same picture',
                title: 'Which two are the same?',
                helper: 'Look carefully and pick the matching picture.',
                badge: 'Sharp Eyes',
                type: 'choice',
                questions: [
                    {
                        art: '☀️',
                        prompt: 'Which picture matches the sun clue?',
                        options: [
                            { value: 'sun', icon: '☀️', label: 'Sun' },
                            { value: 'moon', icon: '🌙', label: 'Moon' },
                            { value: 'cloud', icon: '☁️', label: 'Cloud' }
                        ],
                        answer: 'sun',
                        success: 'Great watching! The sun matched the clue.'
                    },
                    {
                        art: '🍉  🍉  🍋',
                        prompt: 'Tap the fruit that has a pair.',
                        options: [
                            { value: 'watermelon', icon: '🍉', label: 'Watermelon' },
                            { value: 'lemon', icon: '🍋', label: 'Lemon' },
                            { value: 'pear', icon: '🍐', label: 'Pear' }
                        ],
                        answer: 'watermelon',
                        success: 'You saw the matching watermelons.'
                    },
                    {
                        art: '🐠  🐟  🐠',
                        prompt: 'Which fish has a match?',
                        options: [
                            { value: 'blue-fish', icon: '🐠', label: 'Blue fish' },
                            { value: 'striped-fish', icon: '🐟', label: 'Striped fish' },
                            { value: 'whale', icon: '🐳', label: 'Whale' }
                        ],
                        answer: 'blue-fish',
                        success: 'Nice! The blue fish made the pair.'
                    }
                ]
            },
            {
                id: 'pattern-play',
                navLabel: 'Pattern play',
                title: 'What comes next?',
                helper: 'Look for the pattern and finish it.',
                badge: 'Pattern Pro',
                type: 'choice',
                questions: [
                    {
                        art: '⭐ 🌙 ⭐ 🌙 _',
                        prompt: 'What comes next in the pattern?',
                        options: [
                            { value: 'star', icon: '⭐', label: 'Star' },
                            { value: 'sun', icon: '☀️', label: 'Sun' },
                            { value: 'cloud', icon: '☁️', label: 'Cloud' }
                        ],
                        answer: 'star',
                        success: 'Yes! Star and moon keep taking turns.'
                    },
                    {
                        art: '🍎 🍌 🍎 🍌 _',
                        prompt: 'Which fruit comes next?',
                        options: [
                            { value: 'banana', icon: '🍌', label: 'Banana' },
                            { value: 'apple', icon: '🍎', label: 'Apple' },
                            { value: 'pear', icon: '🍐', label: 'Pear' }
                        ],
                        answer: 'apple',
                        success: 'Correct! Apple comes next in the pattern.'
                    },
                    {
                        art: '🔵 🔵 🟣 🔵 🔵 🟣 _',
                        prompt: 'Which color shape comes next?',
                        options: [
                            { value: 'purple', icon: '🟣', label: 'Purple' },
                            { value: 'blue', icon: '🔵', label: 'Blue' },
                            { value: 'green', icon: '🟢', label: 'Green' }
                        ],
                        answer: 'blue',
                        success: 'The pattern starts again with blue.'
                    }
                ]
            }
        ]
    }
};
