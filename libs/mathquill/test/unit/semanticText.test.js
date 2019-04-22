suite('Semantic Tree', function() {
  var mq;
  setup(function() {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
  });
  teardown(function() {
    $(mq.el()).remove();
  });

  function assertSemanticText(inputLatex, expectedText, typed = true) {
    if (typed) {
      mq.latex('');
      mq.typedText(inputLatex); 
    } else {
      mq.latex(inputLatex);
    }
    try {
      var text = mq.semanticText();
    } 
    catch(e) {
      assert.fail('Couldn\'t even parse ' + inputLatex + ': ' + e.message);
    }
    assert.equal(text, expectedText);
  }

  test('external operators', function() {
    var testFuncs = ['f','g', 'abc', 'voltage'];
    let processed = optionProcessors.externalOperators(testFuncs.join(' '));
    for (var name of testFuncs) {
      assert.equal(processed[name], 1);
    }
    assert.equal(processed._maxLength, 7);

    mq.config({ externalOperators: testFuncs.join(' ')});

    assertSemanticText('f(x)', 'f (x)');
    assertSemanticText('abc(x)', 'abc(x)');
    assertSemanticText('voltage(x)', 'voltage(x)');
  });

  test('integration tests', function() {
    //Test basic sin(x)
    assertSemanticText('sin(x)', 'sin(x)');
    //Test sin cos xy
    assertSemanticText('sincos xy', 'sin(cos((x*y)))');
    //Test some fractions and spaces
    assertSemanticText('4 x/y', '(4*(x/y))');
    //Test order of operations and associativity
    assertSemanticText('a+b-cde^{fg}-h-j', '((((a+b)-((c*d)*(e^(f*g))))-h)-j)', false);
    //Test multipliers being inserted between variables and functions
    assertSemanticText('asin x', '(a*sin(x))');
    //Test sin(a)b(c)
    assertSemanticText('sin(a)b(c)', '((sin(a)*b)*(c))');
    //Test exponentiation associativity
    assertSemanticText('a^{b^{c^d}}', '(a^(b^(c^d)))', false);
    //Test sin^2(x)
    assertSemanticText('\\sin^2\\left(x\\right)', '(sin(x)^2)', false);
    //Test first-order derivatives
    assertSemanticText('\\frac{d}{dx}xy^z+w', '(d((x*(y^z)),x,1)+w)', false);
    //Test second-order derivatives
    assertSemanticText('\\frac{d^5}{dx^5}x', 'd(x,x,5)', false);
    //Test left associativity
    assertSemanticText('a-b+c', '((a-b)+c)');
  });

  test('greek alphabet tests', function() {
    var letterNames = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];
    var upperCaseSymbols = ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','ϒ','Φ','Χ','Ψ','Ω'];
    var lowerCaseSymbols = ['α','β','γ','δ','ϵ','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','ϕ','χ','ψ','ω'];
    var skipLowerCase = ['omicron'];
    var skipUpperCase = ['alpha', 'beta', 'epsilon', 'zeta', 'eta', 'iota', 'kappa', 'mu', 'nu', 'omicron', 'rho', 'tau', 'chi'];

    for (var i = 0; i < letterNames.length; i++) {
      var letterName = letterNames[i];
      var lowerCaseCmd = '\\' + letterName;
      var upperCaseCmd = '\\' + letterName.charAt(0).toUpperCase() + letterName.slice(1);
      if (!skipLowerCase.includes(letterName)) {
        assertSemanticText(lowerCaseCmd, lowerCaseSymbols[i], false);
        assertSemanticText(lowerCaseSymbols[i], lowerCaseSymbols[i], false);
      }
      if (!skipUpperCase.includes(letterName)) {
        assertSemanticText(upperCaseCmd, upperCaseSymbols[i], false);
        assertSemanticText(upperCaseSymbols[i], upperCaseSymbols[i], false);
      }
    }
  });

  test('new tests', function() {
  });

});
