function CPU({ memory }) {
  let address;
  let writeToA;
  let op;
  let cyclesBurnt = 0;
  let A = 0;
  let X = 0;
  let Y = 0;
  let SP = 0;
  let PC = 0x8000;
  let P = 0;
  // let debugPC = PC;
  // let delayInterrupt = false;
  let flagI = false;
  let flagB = true;
  let flagC = false;
  let flagN = true;
  let flagD = false;
  let flagV = false;
  let flagZ = false;
  let irqRequested = false;
  let nmiRequested = false;

  const LOW = 0xff;
  const HIGH = 0xff00;
  const VECTOR_NMI = 0xfffa;
  const VECTOR_RESET = 0xfffc;
  const VECTOR_IRQ = 0xfffe;

  function reset() {
    interrupt(VECTOR_RESET);
  }

  /**
   * Request an NMI interrupt.
   */
  function requestNMI() {
    nmiRequested = true;
  }

  /**
   * Request an IRQ interrupt.
   */
  function requestIRQ() {
    irqRequested = true;
  }

  /**
   * Handle an NMI interrupt.
   */
  function doNMI() {
    interrupt(VECTOR_NMI);
    nmiRequested = false;
  }

  /**
   * Handle an IRQ interrupt.
   */
  function doIRQ() {
    interrupt(VECTOR_IRQ);
    irqRequested = false;
  }

  function interrupt(vector) {
    // push PC and P onto stack
    push((PC & HIGH) >> 8);
    push(PC & LOW);

    setP();
    push(P);

    // make sure NMI handler doesn't get interrupted
    flagI = 1;

    // go to interrupt handler
    PC = peekWord(vector);

    burn(7);
  }

  function burn(cycles) {
    cyclesBurnt += cycles;
  }

  function tick() {
    cyclesBurnt -= 1;

    if (cyclesBurnt > 0) {
      return;
    }

    cyclesBurnt = 0;

    setP();

    if (irqRequested && !flagI /* && !delayInterrupt */) {
      doIRQ();
    }

    op = peek(PC);

    /* console.log(
      PC.toString(16).toUpperCase() +
      " " + op.toString(16).toUpperCase() +
      " A:" + A.toString(16) +
      " X:" + X.toString(16) +
      " Y:" + Y.toString(16) +
      " P:" + P.toString(16) +
      " SP:" + SP.toString(16)
    ); */

    execute(op);

    if (nmiRequested) {
      doNMI();
    }

    // delayInterrupt = false; // TODO, all other interrupt delays
  }

  /**
   * Execute a single opcode.
   */
  function execute(op) {
    writeToA = 0;
    address = 0xf0000;

    // debugPC = PC;

    switch (op) {
      case 0x3e:
        absoluteIndexedX();
        ROL();
        burn(7);
        break;
      case 0x3d:
        absoluteIndexedX();
        AND();
        burn(4);
        break;
      case 0x85:
        zeroPage();
        STA();
        burn(3);
        break;
      case 0x84:
        zeroPage();
        STY();
        burn(3);
        break;
      case 0x28:
        implied();
        PLP();
        burn(4);
        break;
      case 0x29:
        immediate();
        AND();
        burn(2);
        break;
      case 0xf8:
        implied();
        SED();
        burn(2);
        break;
      case 0xf9:
        absoluteIndexedY();
        SBC();
        burn(4);
        break;
      case 0xf6:
        zeroPageIndexedX();
        INC();
        burn(6);
        break;
      case 0x20:
        absolute();
        JSR();
        burn(6);
        break;
      case 0x21:
        indexedIndirectX();
        AND();
        burn(6);
        break;
      case 0x26:
        zeroPage();
        ROL();
        burn(5);
        break;
      case 0x86:
        zeroPage();
        STX();
        burn(3);
        break;
      case 0x24:
        zeroPage();
        BIT();
        burn(3);
        break;
      case 0x25:
        zeroPage();
        AND();
        burn(2);
        break;
      case 0x35:
        zeroPageIndexedX();
        AND();
        burn(3);
        break;
      case 0x36:
        zeroPageIndexedX();
        ROL();
        burn(6);
        break;
      case 0x31:
        indirectIndexedY();
        AND();
        burn(5);
        break;
      case 0x30:
        relative();
        BMI();
        burn(2);
        break;
      case 0x39:
        absoluteIndexedY();
        AND();
        burn(4);
        break;
      case 0x38:
        implied();
        SEC();
        burn(2);
        break;
      case 0x8c:
        absolute();
        STY();
        burn(4);
        break;
      case 0x2c:
        absolute();
        BIT();
        burn(4);
        break;
      case 0xfd:
        absoluteIndexedX();
        SBC();
        burn(4);
        break;
      case 0xfe:
        absoluteIndexedX();
        INC();
        burn(7);
        break;
      case 0x2d:
        absolute();
        AND();
        burn(4);
        break;
      case 0x2e:
        absolute();
        ROL();
        burn(6);
        break;
      case 0xba:
        implied();
        TSX();
        burn(2);
        break;
      case 0x5e:
        absoluteIndexedX();
        LSR();
        burn(7);
        break;
      case 0x5d:
        absoluteIndexedX();
        EOR();
        burn(4);
        break;
      case 0x40:
        implied();
        RTI();
        burn(6);
        break;
      case 0x41:
        indexedIndirectX();
        EOR();
        burn(6);
        break;
      case 0x45:
        zeroPage();
        EOR();
        burn(3);
        break;
      case 0x46:
        zeroPage();
        LSR();
        burn(5);
        break;
      case 0x48:
        implied();
        PHA();
        burn(3);
        break;
      case 0x49:
        immediate();
        EOR();
        burn(2);
        break;
      case 0xae:
        absolute();
        LDX();
        burn(4);
        break;
      case 0xad:
        absolute();
        LDA();
        burn(4);
        break;
      case 0xac:
        absolute();
        LDY();
        burn(4);
        break;
      case 0xaa:
        implied();
        TAX();
        burn(2);
        break;
      case 0x4a:
        accumulator();
        LSR();
        burn(2);
        break;
      case 0x4c:
        absolute();
        JMP();
        burn(3);
        break;
      case 0x4d:
        absolute();
        EOR();
        burn(4);
        break;
      case 0x4e:
        absolute();
        LSR();
        burn(6);
        break;
      case 0x51:
        indirectIndexedY();
        EOR();
        burn(5);
        break;
      case 0x50:
        relative();
        BVC();
        burn(2);
        break;
      case 0x56:
        zeroPageIndexedX();
        LSR();
        burn(6);
        break;
      case 0x55:
        zeroPageIndexedX();
        EOR();
        burn(4);
        break;
      case 0x9a:
        implied();
        TXS();
        burn(2);
        break;
      case 0xe5:
        zeroPage();
        SBC();
        burn(3);
        break;
      case 0x59:
        absoluteIndexedY();
        EOR();
        burn(4);
        break;
      case 0x58:
        implied();
        CLI();
        burn(2);
        break;
      case 0x2a:
        accumulator();
        ROL();
        burn(2);
        break;
      case 0xa9:
        immediate();
        LDA();
        burn(2);
        break;
      case 0xa8:
        implied();
        TAY();
        burn(2);
        break;
      case 0xa6:
        zeroPage();
        LDX();
        burn(3);
        break;
      case 0xa5:
        zeroPage();
        LDA();
        burn(3);
        break;
      case 0xa2:
        immediate();
        LDX();
        burn(2);
        break;
      case 0xa1:
        indexedIndirectX();
        LDA();
        burn(6);
        break;
      case 0xa0:
        immediate();
        LDY();
        burn(2);
        break;
      case 0xa4:
        zeroPage(0);
        LDY();
        burn(3);
        break;
      case 0xf5:
        zeroPageIndexedX();
        SBC();
        burn(4);
        break;
      case 0x7e:
        absoluteIndexedX();
        ROR();
        burn(7);
        break;
      case 0x7d:
        absoluteIndexedX();
        ADC();
        burn(4);
        break;
      case 0xf0:
        relative();
        BEQ();
        burn(2);
        break;
      case 0x68:
        implied();
        PLA();
        burn(4);
        break;
      case 0x69:
        immediate();
        ADC();
        burn(2);
        break;
      case 0x66:
        zeroPage();
        ROR();
        burn(5);
        break;
      case 0x65:
        zeroPage();
        ADC();
        burn(3);
        break;
      case 0x60:
        implied();
        RTS();
        burn(6);
        break;
      case 0x61:
        indexedIndirectX();
        ADC();
        burn(6);
        break;
      case 0xce:
        absolute();
        DEC();
        burn(6);
        break;
      case 0xcd:
        absolute();
        CMP();
        burn(4);
        break;
      case 0xb8:
        implied();
        CLV();
        burn(2);
        break;
      case 0xb9:
        absoluteIndexedY();
        LDA();
        burn(4);
        break;
      case 0xca:
        implied();
        DEX();
        burn(2);
        break;
      case 0xcc:
        absolute();
        CPY();
        burn(4);
        break;
      case 0xb0:
        relative();
        BCS();
        burn(2);
        break;
      case 0xb1:
        indirectIndexedY();
        LDA();
        burn(5);
        break;
      case 0xb6:
        zeroPageIndexedY();
        LDX();
        burn(4);
        break;
      case 0xb4:
        zeroPageIndexedX();
        LDY();
        burn(4);
        break;
      case 0xb5:
        zeroPageIndexedX();
        LDA();
        burn(4);
        break;
      case 0x8a:
        implied();
        TXA();
        burn(2);
        break;
      case 0x6d:
        absolute();
        ADC();
        burn(4);
        break;
      case 0x6e:
        absolute();
        ROR();
        burn(6);
        break;
      case 0x6c:
        indirect();
        JMP();
        burn(5);
        break;
      case 0x6a:
        accumulator();
        ROR();
        burn(2);
        break;
      case 0x79:
        absoluteIndexedY();
        ADC();
        burn(4);
        break;
      case 0x78:
        implied();
        SEI();
        burn(2);
        break;
      case 0x71:
        indirectIndexedY();
        ADC();
        burn(5);
        break;
      case 0x70:
        relative();
        BVS();
        burn(2);
        break;
      case 0x75:
        zeroPageIndexedX();
        ADC();
        burn(4);
        break;
      case 0x76:
        zeroPageIndexedX();
        ROR();
        burn(6);
        break;
      case 0xc5:
        zeroPage();
        CMP();
        burn(3);
        break;
      case 0xc4:
        zeroPage();
        CPY();
        burn(3);
        break;
      case 0xc6:
        zeroPage();
        DEC();
        burn(5);
        break;
      case 0xc1:
        indexedIndirectX();
        CMP();
        burn(6);
        break;
      case 0xc0:
        immediate();
        CPY();
        burn(2);
        break;
      case 0xbc:
        absoluteIndexedX();
        LDY();
        burn(4);
        break;
      case 0xe4:
        zeroPage();
        CPX();
        burn(3);
        break;
      case 0xc9:
        immediate();
        CMP();
        burn(2);
        break;
      case 0xc8:
        implied();
        INY();
        burn(2);
        break;
      case 0xbd:
        absoluteIndexedX();
        LDA();
        burn(4);
        break;
      case 0xbe:
        absoluteIndexedY();
        LDX();
        burn(4);
        break;
      case 0xf1:
        indirectIndexedY();
        SBC();
        burn(5);
        break;
      case 0xe9:
        immediate();
        SBC();
        burn(2);
        break;
      case 0xd0:
        relative();
        BNE();
        burn(2);
        break;
      case 0xd1:
        indirectIndexedY();
        CMP();
        burn(5);
        break;
      case 0x9d:
        absoluteIndexedX();
        STA();
        burn(5);
        break;
      case 0x08:
        implied();
        PHP();
        burn(3);
        break;
      case 0xd5:
        zeroPageIndexedX();
        CMP();
        burn(4);
        break;
      case 0xd6:
        zeroPageIndexedX();
        DEC();
        burn(6);
        break;
      case 0xd8:
        implied();
        CLD();
        burn(2);
        break;
      case 0xd9:
        absoluteIndexedY();
        CMP();
        burn(4);
        break;
      case 0x06:
        zeroPage();
        ASL();
        burn(5);
        break;
      case 0x00:
        implied();
        BRK();
        burn(7);
        break;
      case 0x01:
        indexedIndirectX();
        ORA();
        burn(6);
        break;
      case 0xec:
        absolute();
        CPX();
        burn(4);
        break;
      case 0x05:
        zeroPage();
        ORA();
        burn(2);
        break;
      case 0xea:
        implied();
        NOP();
        burn(2);
        break;
      case 0x81:
        indexedIndirectX();
        STA();
        burn(6);
        break;
      case 0xee:
        absolute();
        INC();
        burn(6);
        break;
      case 0xed:
        absolute();
        SBC();
        burn(4);
        break;
      case 0x1e:
        absoluteIndexedX();
        ASL();
        burn(7);
        break;
      case 0x1d:
        absoluteIndexedX();
        ORA();
        burn(4);
        break;
      case 0x88:
        implied();
        DEY();
        burn(2);
        break;
      case 0x09:
        immediate();
        ORA();
        burn(2);
        break;
      case 0x8d:
        absolute();
        STA();
        burn(4);
        break;
      case 0x8e:
        absolute();
        STX();
        burn(4);
        break;
      case 0xe1:
        indexedIndirectX();
        SBC();
        burn(6);
        break;
      case 0xe0:
        immediate();
        CPX();
        burn(2);
        break;
      case 0xe6:
        zeroPage();
        INC();
        burn(5);
        break;
      case 0x19:
        absoluteIndexedY();
        ORA();
        burn(4);
        break;
      case 0x18:
        implied();
        CLC();
        burn(2);
        break;
      case 0x16:
        zeroPageIndexedX();
        ASL();
        burn(6);
        break;
      case 0x15:
        zeroPageIndexedX();
        ORA();
        burn(3);
        break;
      case 0xe8:
        implied();
        INX();
        burn(2);
        break;
      case 0x11:
        indirectIndexedY();
        ORA();
        burn(5);
        break;
      case 0x10:
        relative();
        BPL();
        burn(2);
        break;
      case 0x96:
        zeroPageIndexedY();
        STX();
        burn(4);
        break;
      case 0x95:
        zeroPageIndexedX();
        STA();
        burn(4);
        break;
      case 0x94:
        zeroPageIndexedX();
        STY();
        burn(4);
        break;
      case 0xdd:
        absoluteIndexedX();
        CMP();
        burn(4);
        break;
      case 0xde:
        absoluteIndexedX();
        DEC();
        burn(7);
        break;
      case 0x91:
        indirectIndexedY();
        STA();
        burn(6);
        break;
      case 0x90:
        relative();
        BCC();
        burn(2);
        break;
      case 0x0d:
        absolute();
        ORA();
        burn(4);
        break;
      case 0x0e:
        absolute();
        ASL();
        burn(6);
        break;
      case 0x0a:
        accumulator();
        ASL();
        burn(2);
        break;
      case 0x99:
        absoluteIndexedY();
        STA();
        burn(5);
        break;
      case 0x98:
        implied();
        TYA();
        burn(2);
        break;
      default:
        PC += 1;
      // throw new Error("Invalid opcode! " + op);
    }
  }

  function read() {
    if (!writeToA && address === 0xf0000) {
      throw new Error('invalid read');
    }

    if (writeToA) {
      return A;
    } else {
      return peek(address);
    }
  }

  /**
   * Read method for read-mod-write instructions.
   * Read-mod-write instructions incorrectly write back the read value before
   * writing any correct value.
   */
  function modRead() {
    return write(read());
  }

  function write(value) {
    if (writeToA) {
      writeA(value);
    } else {
      poke(address, value);
    }

    if (value > 0xff) {
      throw new Error('invalid write');
    }

    return value;
  }

  function writeA(value) {
    A = value;
  }

  /** *****************************************************
   * Addressing modes
   */

  function implied() {
    PC += 1;
  }

  function accumulator() {
    writeToA = 1;

    PC += 1;
  }

  function immediate() {
    address = PC + 1;

    PC += 2;
  }

  function relative() {
    address = PC + 1;

    PC += 2;
  }

  function absolute() {
    const high = peek(PC + 2) << 8;
    const low = peek(PC + 1);

    address = high | low;

    PC += 3;
  }

  function zeroPage(index) {
    const base = peek(PC + 1);

    index = index || 0;
    address = (base + index) & 0xff;

    PC += 2;
  }

  function absoluteIndexed(index) {
    const high = peek(PC + 2) << 8;
    const low = peek(PC + 1);
    const base = high | low;

    address = (base + index) & 0xffff;

    if ((low + X) & 0xff00) {
      // oops cycle
      burn(1);
    }

    PC += 3;
  }

  function absoluteIndexedX() {
    absoluteIndexed(X);
  }

  function absoluteIndexedY() {
    absoluteIndexed(Y);
  }

  function zeroPageIndexedX() {
    zeroPage(X);
  }

  function zeroPageIndexedY() {
    zeroPage(Y);
  }

  function indirect() {
    const lowAddress = peekWord(PC + 1);
    let highAddress = lowAddress + 1;

    // due to a bug in the 6502, the most significant byte of the address is always fetched
    // from the same page as the least significant byte
    if ((lowAddress & 0xff) === 0xff) {
      highAddress = lowAddress - 0xff;
    }

    let low = peek(lowAddress);
    let high = peek(highAddress) << 8;

    address = high | low;

    PC += 3;
  }

  function indexedIndirectX() {
    const peeked = peek(PC + 1);
    const newAddress = peeked + X;
    const low = peek(newAddress & 0xff);
    const high = peek((newAddress + 1) & 0xff) << 8;

    address = high | low;

    if ((peeked & 0xff00) !== (newAddress & 0xff00)) {
      burn(1);
    }

    PC += 2;
  }

  function indirectIndexedY() {
    const newAddress = peek(PC + 1);
    const low = peek(newAddress);
    const high = peek((newAddress + 1) & 0xff) << 8;

    address = ((high | low) + Y) & 0xffff;

    PC += 2;
    // TODO oops cycle
  }

  /** *****************************************************
   * Operations
   */

  /**
   * Add with carry.
   * Opcodes: 0x69, 0x65, 0x75, 0x6d, 0x7d, 0x79, 0x61, 0x71
   */
  function ADC() {
    doADC(read());
  }

  /**
   * Actually perform add with carry.
   * Useful, as SBC is also a modified add-with-carry.
   */
  function doADC(value) {
    const t = A + value + flagC;

    flagV = !!((A ^ t) & (value ^ t) & 0x80) && 1;
    flagN = !!(t & 0x80);
    flagC = (t > 255);
    flagZ = !(t & 0xff);

    writeA(t & 0xff);
  }

  /**
   * Bitwise AND.
   * Opcodes: 0x29, 0x25, 0x35, 0x2d, 0x3d, 0x39, 0x21, 0x31
   */
  function AND() {
    let value = read();
    if (value === 4) {
      // value = value;
    }
    writeA(A & value);
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Arithmetic Shift Left.
   * Opcodes: 0x0a, 0x06, 0x16, 0x0e, 0x1e.
   */
  function ASL() {
    const value = modRead();
    const result = write((value << 1) & 0xfe);

    flagC = (value & 0x80) && 1;
    flagN = (result & 0x80) && 1;
    flagZ = +(result === 0);
  }

  /**
   * Branch on Carry Set.
   * Opcodes: 0xb0
   */
  function BCS() {
    branch(flagC);
  }

  /**
   * Branch on Carry Clear.
   * Opcodes: 0x90
   */
  function BCC() {
    branch(!flagC);
  }

  /**
   * Branch on EQual.
   * Opcodes: 0xf0
   */
  function BEQ() {
    branch(flagZ);
  }

  /**
   * Branch on Not Equal.
   * Opcodes: 0xd0
   */
  function BNE() {
    branch(!flagZ);
  }

  /**
   * Branch on MInus.
   * Opcodes: 0x30
   */
  function BMI() {
    branch(flagN);
  }

  /**
   * Branch on PLus.
   * Opcodes: 0x10
   */
  function BPL() {
    branch(!flagN);
  }

  /**
   * Branch on oVerflow Set.
   * Opcodes: 0x70
   */
  function BVS() {
    branch(flagV);
  }

  /**
   * Branch on oVerflow Clear.
   * Opcodes: 0x50
   */
  function BVC() {
    branch(!flagV);
  }

  /**
   * Helper function for all branching operations.
   * @param {boolean} flag - If true, do branch. Otherwise do nothing.
   */
  function branch(flag) {
    let offset = read();
    const prevHigh = PC & HIGH;
    let curHigh = 0;

    if (flag) {
      // branching burns a cycle
      burn(1);

      if (offset & 0x80) {
        offset = -complement(offset);
      }

      PC += offset;
      curHigh = PC & HIGH;

      if (prevHigh !== curHigh) {
        // crossing page boundary, burns a cycle
        burn(1);
      }
    }
  }

  /**
   * Test bits in memory.
   * Opcodes: 0x24, 0x2c
   * BIT sets the Z flag as though the value in the address tested were ANDed with
   * the accumulator. The S and V flags are set to match bits 7 and 6 respectively
   * in the value stored at the tested address.
   */
  function BIT() {
    const value = read();
    const t = A & value;
    flagN = (value & 0x80) && 1;
    flagV = (value & 0x40) && 1;
    flagZ = +(t === 0);
  }

  /**
   * Trigger an non-maskable interrupt.
   * Opcodes: 0x00
   */
  function BRK() {
    PC += 1;
    push((PC & HIGH) >> 8);
    push(PC & LOW);

    setP();
    push(P | 0x10);

    let low = peek(0xfffe);
    let high = peek(0xffff) << 8;
    PC = high | low;
  }

  /**
   * Clear Carry flag.
   * Opcodes: 0x18
   */
  function CLC() {
    flagC = 0;
  }

  /**
   * Clear Decimal flag.
   * Opcodes: 0x58
   */
  function CLD() {
    flagD = 0;
  }

  /**
   * Clear Interrupt flag.
   * Opcodes: 0x58
   */
  function CLI() {
    flagI = 0;
    // delayInterrupt = true;
  }

  /**
   * Clear oVerflow flag.
   * Opcodes: 0xbe
   */
  function CLV() {
    flagV = 0;
  }

  /**
   * Compare Accumulator with memory.
   * Opcodes: 0xc9, 0xc5, 0xd5, 0xcd, 0xdd, 0xd9, 0xc1, 0xd1
   * @see xCMP
   */
  function CMP() {
    xCMP(A);
  }

  /**
   * Compare X with memory.
   * Opcodes: 0xe0, 0xe4, 0xec
   * @see xCMP
   */
  function CPX() {
    xCMP(X);
  }

  /**
   * Compare Y with memory.
   * Opcodes: 0xc0, 0xc4, 0xcc
   * @see xCMP
   */
  function CPY() {
    xCMP(Y);
  }

  /**
   * Compare value with memory as if subtraction was carried out.
   * @param {number} value - The value to compare with memory.
   */
  function xCMP(value) {
    const readValue = read();
    const t = (value - readValue) & 0xff;
    flagN = (t & 0x80) && 1;
    flagC = +(value >= readValue);
    flagZ = +(t === 0);
  }

  /**
   * Decrement memory.
   * Opcodes: 0xc6, 0xd6, 0xce, 0xde
   */
  function DEC() {
    const result = write((modRead() - 1) & 0xff);
    flagN = +!!(result & 0x80);
    flagZ = +(result === 0);
  }

  /**
   * Decrement X.
   * Opcodes: 0xca
   */
  function DEX() {
    X = (X - 1) & 0xff;
    flagZ = +(X === 0);
    flagN = (X & 0x80) && 1;
  }

  /**
   * Decrement Y.
   * Opcodes: 0x88
   */
  function DEY() {
    Y = (Y - 1) & 0xff;
    flagZ = +(Y === 0);
    flagN = (Y & 0x80) && 1;
  }

  /**
   * Exclusive bitwise OR.
   * Opcodes: 0x49, 0x45, 0x55, 0x4d, 0x5d, 0x59, 0x41, 0x51
   */
  function EOR() {
    writeA(A ^ read());
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Increment memory.
   * Opcodes: 0xe6, 0xf6, 0xee, 0xfe
   */
  function INC() {
    const result = write((modRead() + 1) & 0xff);
    flagN = !!(result & 0x80);
    flagZ = (result === 0);
  }

  /**
   * Increment X.
   * Opcodes: 0xe8
   */
  function INX() {
    X = (X + 1) & 0xff;
    flagN = (X & 0x80) && 1;
    flagZ = +(X === 0);
  }

  /**
   * Increment Y.
   * Opcodes: 0xc8
   */
  function INY() {
    Y = (Y + 1) & 0xff;
    flagN = (Y & 0x80) && 1;
    flagZ = +(Y === 0);
  }

  /**
   * Jump to memory location.
   * Opcodes: 0x4c, 0x6c
   */
  function JMP() {
    PC = address;
  }

  /**
   * Jump to Sub-Routine.
   * Opcodes: 0x20
   */
  function JSR() {
    const t = PC - 1;
    push((t & HIGH) >> 8);
    push(t & LOW);
    PC = address;
  }

  /**
   * Load Accumulator with memory.
   * Opcodes: 0xa9, 0xa5, 0xb5, 0xad, 0xbd, 0xb9, 0xa1, 0xb1
   */
  function LDA() {
    const value = read();

    writeA(value);
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Load X with memory.
   * Opcodes: 0xa2, 0xa6, 0xb6, 0xae, 0xbe
   */
  function LDX() {
    X = read();
    flagN = (X & 0x80) && 1;
    flagZ = +(X === 0);
  }

  /**
   * Load Y with memory.
   * Opcodes: 0xa0, 0xa4, 0xb4, 0xac, 0xbc
   */
  function LDY() {
    Y = read();
    flagN = (Y & 0x80) && 1;
    flagZ = +(Y === 0);
  }

  /**
   * Logical Shift Right.
   * Opcodes: 0x4a, 0x46, 0x56, 0x4e, 0x5e
   */
  function LSR() {
    const value = modRead();

    flagN = 0;
    flagC = (value & 0x01) && 1;
    const result = write((value >>> 1) & 0xff);
    flagZ = +(result === 0);
  }

  /**
   * No operation. Aside from performing no operation, it also does nothing.
   * Opcodes: 0xea
   */
  function NOP() {
    // do nothing
  }

  /**
   * Bitwise OR with Accumulator.
   * Opcodes: 0x09, 0x05, 0x15, 0x0d, 0x1d, 0x19, 0x01, 0x11
   */
  function ORA() {
    writeA(A | read());
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Push Accumulator to stack.
   * Opcodes: 0x48
   */
  function PHA() {
    push(A);
  }

  /**
   * Push P to stack.
   * Opcodes: 0x08
   */
  function PHP() {
    setP();
    push(P | 0x10);
  }

  /**
   * Pull Accumulator from stack.
   * Opcodes: 0x68
   */
  function PLA() {
    writeA(pop());
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Pull P from stack.
   * Opcodes: 0x28
   */
  function PLP() {
    P = pop();
    setFlags();
  }

  /**
   * Rotate left.
   * Opcodes: 0x2a, 0x26, 0x36, 0x2e, 0x3e
   */
  function ROL() {
    const value = modRead();
    let result = (value << 1) & 0xfe;

    result = write(result | flagC);
    flagC = (value & 0x80) && 1;
    flagZ = +(result === 0);
    flagN = (result & 0x80) && 1;
  }

  /**
   * Rotate right.
   * Opcodes: 0x6a, 0x66, 0x76, 0x6e, 0x7e.
   */
  function ROR() {
    const value = modRead();
    let result = (value >>> 1) & 0xff;

    result = write(result | (flagC ? 0x80 : 0));
    flagC = value & 0x01;
    flagZ = +(result === 0);
    flagN = (result & 0x80) && 1;
  }

  /**
   * Return from interrupt.
   * Opcodes: 0x40
   */
  function RTI() {
    P = pop();
    setFlags();
    let low = pop();
    let high = pop() << 8;
    PC = high | low;
  }

  /**
   * Return from subroutine.
   * Opcodes: 0x60
   */
  function RTS() {
    let low = pop();
    let high = pop() << 8;
    PC = (high | low) + 1;
  }

  /**
   * Subtract with carry.
   * Opcodes: 0xe9, 0xe5, 0xf5, 0xed, 0xfd, 0xf9, 0xe1, 0xf1
   */
  function SBC() {
    doADC(read() ^ 0xff);
  }

  /**
   * Set Carry flag.
   * Opcodes: 0x38
   */
  function SEC() {
    flagC = 1;
  }

  /**
   * Set Decimal flag.
   * Opcodes: 0xf8
   */
  function SED() {
    flagD = 1;
  }

  /**
   * Set interrupt flag.
   * Opcodes: 0x78
   */
  function SEI() {
    flagI = 1;
  }

  /**
   * Store accumulator in memory.
   * Opcodes: 0x85, 0x95, 0x8d, 0x9d, 0x99, 0x81, 0x91
   */
  function STA() {
    write(A);
  }

  /**
   * Store X in memory.
   * Opcodes: 0x86, 0x96, 0x8e
   */
  function STX() {
    write(X);
  }

  /**
   * Store Y in memory.
   * Opcodes: 0x84, 0x94, 0x8c
   */
  function STY() {
    write(Y);
  }

  /**
   * Transfer Accumulator to X.
   * Opcodes: 0xaa
   */
  function TAX() {
    X = A;
    flagN = (X & 0x80) && 1;
    flagZ = +(X === 0);
  }

  /**
   * Transfer Accumulator to Y.
   * Opcodes: 0xa8
   */
  function TAY() {
    Y = A;
    flagN = (Y & 0x80) && 1;
    flagZ = +(Y === 0);
  }

  /**
   * Transfer Stack Pointer to X.
   * Opcodes: 0xba
   */
  function TSX() {
    X = SP;
    flagN = (X & 0x80) && 1;
    flagZ = +(X === 0);
  }

  /**
   * Transer X to Accumulator.
   * Opcodes: 0x8a
   */
  function TXA() {
    writeA(X);
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Transfer X to Stack Pointer.
   * Opcodes: 0x9a
   */
  function TXS() {
    SP = X;
  }

  /**
   * Transfer Y to Accumulator.
   * Opcodes: 0x98
   */
  function TYA() {
    writeA(Y);
    flagN = (A & 0x80) && 1;
    flagZ = +(A === 0);
  }

  /**
   * Write a value to memory.
   */
  function poke(index, value) {
    memory.write(index, value);
  }

  /**
   * Read a value from memory.
   */
  function peek(index) {
    return memory.read(index);
  }

  /**
   * Peek a 16-bit word from memory.
   */
  function peekWord(index) {
    const low = peek(index);
    const high = peek((index + 1) & 0xffff) << 8;

    return (low | high);
  }

  /**
   * Pop a value from stack.
   */
  function pop() {
    SP = (SP + 1) & 0xff;
    return peek(SP | 0x100);
  }

  /**
   * Push a value to stack.
   */
  function push(value) {
    poke(SP | 0x100, value);
    SP = (SP - 1) & 0xff;
  }

  function complement(value) {
    return (~value & 0xff) + 1;
  }

  /**
   * Set flags from value in P.
   */
  function setFlags() {
    flagN = !!(P & 0x80);
    flagV = !!(P & 0x40);
    flagB = !!(P & 0x10);
    flagD = !!(P & 0x08);
    flagI = !!(P & 0x04);
    flagZ = !!(P & 0x02);
    flagC = !!(P & 0x01);
  }

  /**
   * Set P from value in flags.
   */
  function setP() {
    P = (
      (flagN << 7) |
      (flagV << 6) |
      0x20 |
      (flagB << 4) |
      (flagD << 3) |
      (flagI << 2) |
      (flagZ << 1) |
      flagC
    );
  }

  /**
   * Set the Program Counter (PC).
   * Mostly for debugging/testing purposes.
   */
  /* function setPC(value) {
    PC = value;
  } */

  /* function resetCycles() {
    cyclesBurnt = 0;
  } */

  /* function getCycles() {
    return cyclesBurnt;
  } */

  this.burn = burn;
  this.reset = reset;
  this.tick = tick;
  // this.setPC = setPC;

  this.requestNMI = requestNMI;
  this.requestIRQ = requestIRQ;

  // this.getCycles = getCycles;
  // this.resetCycles = resetCycles;
  // this.execute = execute;
}

export default CPU;
