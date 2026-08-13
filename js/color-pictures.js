/* ==========================================================================
   Colour by Number — the picture library.

   Every fillable shape carries data-n="<number>". Optional data-lx / data-ly
   place that shape's number label by hand (always in root 0–320 coordinates,
   mirrored shapes included) — used wherever the shape's middle would clash
   with a face, a spot or another label.
   Anything inside <g class="ink"> is decoration only and cannot be coloured.
   Shapes are painted in document order, so later shapes sit on top.
   ========================================================================== */
window.COLOR_NUMBERS = {
    1: { name: 'Red',    hex: '#F0453A' },
    2: { name: 'Blue',   hex: '#3B82F6' },
    3: { name: 'Yellow', hex: '#FBC02D' },
    4: { name: 'Green',  hex: '#34C759' },
    5: { name: 'Purple', hex: '#A855F7' },
    6: { name: 'Orange', hex: '#FB923C' },
    7: { name: 'Pink',   hex: '#FF7AB6' },
    8: { name: 'Brown',  hex: '#B4713D' }
};

window.COLOR_PICTURES = [
    {
        id: 'caterpillar',
        name: 'Caterpillar',
        emoji: '🐛',
        svg: `
            <path class="zone" data-n="4" data-lx="56" data-ly="266"
                  d="M14 262 C 50 214, 150 206, 246 246 C 176 298, 60 300, 14 262 Z"/>
            <circle class="zone" data-n="1" cx="72"  cy="206" r="36"/>
            <circle class="zone" data-n="2" cx="130" cy="202" r="38"/>
            <circle class="zone" data-n="1" cx="188" cy="198" r="38"/>
            <circle class="zone" data-n="3" cx="250" cy="186" r="46" data-lx="250" data-ly="156"/>
            <g class="ink">
                <path d="M232 148 C 226 116, 218 106, 210 96"/>
                <circle cx="207" cy="90" r="8" fill="#2B2440"/>
                <path d="M268 144 C 274 112, 282 102, 290 92"/>
                <circle cx="293" cy="86" r="8" fill="#2B2440"/>
                <circle cx="236" cy="188" r="6.5" fill="#2B2440" stroke="none"/>
                <circle cx="268" cy="186" r="6.5" fill="#2B2440" stroke="none"/>
                <path d="M234 208 Q 252 224 270 206"/>
                <ellipse cx="58"  cy="240" rx="10" ry="7" fill="#2B2440" stroke="none"/>
                <ellipse cx="108" cy="238" rx="10" ry="7" fill="#2B2440" stroke="none"/>
                <ellipse cx="164" cy="234" rx="10" ry="7" fill="#2B2440" stroke="none"/>
            </g>`
    },

    {
        id: 'butterfly',
        name: 'Butterfly',
        emoji: '🦋',
        svg: `
            <path class="zone" data-n="1" data-lx="56"  data-ly="132"
                  d="M150 130 C 110 58, 40 44, 26 88 C 12 134, 78 168, 148 158 Z"/>
            <path class="zone" data-n="2" data-lx="118" data-ly="212"
                  d="M150 176 C 108 186, 52 214, 66 258 C 80 298, 142 250, 152 206 Z"/>
            <g transform="translate(320,0) scale(-1,1)">
                <path class="zone" data-n="1" data-lx="264" data-ly="132"
                      d="M150 130 C 110 58, 40 44, 26 88 C 12 134, 78 168, 148 158 Z"/>
                <path class="zone" data-n="2" data-lx="202" data-ly="212"
                      d="M150 176 C 108 186, 52 214, 66 258 C 80 298, 142 250, 152 206 Z"/>
            </g>
            <ellipse class="zone" data-n="5" cx="160" cy="182" rx="15" ry="68"/>
            <circle  class="zone" data-n="5" cx="160" cy="92"  r="23"/>
            <circle  class="zone" data-n="3" cx="84"  cy="108" r="15"/>
            <circle  class="zone" data-n="3" cx="236" cy="108" r="15"/>
            <circle  class="zone" data-n="3" cx="96"  cy="246" r="13"/>
            <circle  class="zone" data-n="3" cx="224" cy="246" r="13"/>
            <g class="ink">
                <path d="M150 74 C 138 50, 122 40, 112 36"/>
                <circle cx="108" cy="32" r="7" fill="#2B2440"/>
                <path d="M170 74 C 182 50, 198 40, 208 36"/>
                <circle cx="212" cy="32" r="7" fill="#2B2440"/>
            </g>`
    },

    {
        id: 'fish',
        name: 'Happy Fish',
        emoji: '🐠',
        svg: `
            <path class="zone" data-n="6" data-lx="34" data-ly="160"
                  d="M74 160 L 14 104 C 6 148, 6 174, 14 218 Z"/>
            <path class="zone" data-n="6" data-lx="180" data-ly="74"
                  d="M148 100 C 158 62, 196 50, 216 74 C 190 80, 170 90, 148 100 Z"/>
            <path class="zone" data-n="6" data-lx="180" data-ly="248"
                  d="M148 222 C 158 260, 196 272, 216 248 C 190 242, 170 232, 148 222 Z"/>
            <ellipse class="zone" data-n="2" cx="168" cy="162" rx="104" ry="66"
                     data-lx="150" data-ly="190"/>
            <path class="zone" data-n="1" data-lx="286" data-ly="160"
                  d="M268 148 C 286 138, 302 146, 302 160 C 302 176, 284 182, 268 172 Z"/>
            <circle class="zone" data-n="2" cx="284" cy="74" r="16"/>
            <circle class="zone" data-n="2" cx="252" cy="42" r="13"/>
            <circle class="zone" data-n="2" cx="296" cy="24" r="11"/>
            <g class="ink">
                <circle cx="230" cy="132" r="18" fill="#FFFFFF"/>
                <circle cx="234" cy="134" r="9" fill="#2B2440" stroke="none"/>
                <path d="M214 182 Q 234 196 256 180"/>
                <path d="M118 116 C 136 148, 136 176, 118 208"/>
            </g>`
    },

    {
        id: 'unicorn',
        name: 'Unicorn',
        emoji: '🦄',
        svg: `
            <circle class="zone" data-n="5" cx="88"  cy="200" r="30" data-lx="64"  data-ly="212"/>
            <circle class="zone" data-n="5" cx="84"  cy="148" r="34" data-lx="56"  data-ly="140"/>
            <circle class="zone" data-n="5" cx="122" cy="102" r="30" data-lx="100" data-ly="84"/>
            <path class="zone" data-n="7" data-lx="137" data-ly="96"
                  d="M132 120 L 116 62 L 162 104 Z"/>
            <path class="zone" data-n="7" data-lx="220" data-ly="96"
                  d="M224 120 L 240 62 L 194 104 Z"/>
            <path class="zone" data-n="3" data-lx="178" data-ly="70"
                  d="M158 106 L 178 18 L 198 106 Z"/>
            <circle  class="zone" data-n="7" cx="178" cy="186" r="86" data-lx="178" data-ly="150"/>
            <ellipse class="zone" data-n="1" cx="122" cy="216" rx="21" ry="15"/>
            <ellipse class="zone" data-n="1" cx="234" cy="216" rx="21" ry="15"/>
            <g class="ink">
                <path d="M165 90 L 191 84 M169 66 L 187 60 M174 44 L 182 38" stroke-width="3"/>
                <circle cx="150" cy="190" r="8" fill="#2B2440" stroke="none"/>
                <circle cx="206" cy="190" r="8" fill="#2B2440" stroke="none"/>
                <path d="M138 174 L 132 164 M150 170 L 148 158 M162 172 L 166 162"/>
                <path d="M194 172 L 190 162 M206 170 L 208 158 M218 174 L 224 164"/>
                <path d="M162 248 Q 178 262 194 248"/>
                <ellipse cx="164" cy="232" rx="5" ry="3.5" fill="#2B2440" stroke="none"/>
                <ellipse cx="192" cy="232" rx="5" ry="3.5" fill="#2B2440" stroke="none"/>
            </g>`
    }
];
