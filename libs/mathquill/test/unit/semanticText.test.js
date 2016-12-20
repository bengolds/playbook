suite('Semantic Tree', function() {
  var mq;
  setup(function() {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
  });
  teardown(function() {
    $(mq.el()).remove();
  });

  function assertSemanticText(inputLatex, expectedText) {
    mq.latex(inputLatex); 
    try {
      var text = mq.semanticText();
    } 
    catch(e) {
      assert.fail('Couldn\'t even parse ' + inputLatex + ': ' + e.message);
    }
    assert.equal(text, expectedText);
  }

  test('integration tests', function() {
    //Test basic sin(x)
    assertSemanticText('\\sin\\left(x\\right)', 'sin(x)');
    //Test sin cos xy
    assertSemanticText('\\sin\\cos xy', 'sin(cos((x*y)))');
    //Test some fractions and spaces
    assertSemanticText('4\\ \\frac{x}{y}', '(4*(x/y))');
    //Test order of operations and associativity
    assertSemanticText('a+b-cde^{fg}-h-j', '((((a+b)-((c*d)*(e^(f*g))))-h)-j)');
    //Test multipliers being inserted between variables and functions
    assertSemanticText('a\\sin x', '(a*sin(x))');
    //Test sin(a)b(c)
    assertSemanticText('\\sin\\left(a\\right)b\\left(c\\right)', '((sin(a)*b)*(c))');
    //Test exponentiation associativity
    assertSemanticText('a^{b^{c^d}}', '(a^(b^(c^d)))');
    //Test sin^2(x)
    assertSemanticText('\\sin^2\\left(x\\right)', '(sin(x)^2)');
    //Test first-order derivatives
    assertSemanticText('\\frac{d}{dx}xy^z+w', '(d((x*(y^z)),x,1)+w)');
    //Test second-order derivatives
    assertSemanticText('\\frac{d^5}{dx^5}x', 'd(x,x,5)');
    //Test left associativity
    assertSemanticText('a-b+c', '((a-b)+c)');
  });

  test('greek alphabet tests', function() {
    var letterNames = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];
    var upperCaseSymbols = ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','ϒ','Φ','Χ','Ψ','Ω'];
    var lowerCaseSymbols = ['α','β','γ','δ','ϵ','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','ϕ','χ','ψ','ω'];

    for (var i = 0; i < letterNames.length; i++) {
      var letterName = letterNames[i];
      if (letterName == 'omicron')
        continue;
      var lowerCaseCmd = '\\' + letterName;
      var upperCaseCmd = '\\' + letterName.charAt(0).toUpperCase() + letterName.slice(1);
      assertSemanticText(lowerCaseCmd, lowerCaseSymbols[i]);
      if (letterName == 'alpha' || 
        letterName == 'beta' || 
        letterName == 'epsilon' || 
        letterName == 'zeta' ||
        letterName == 'eta' ||
        letterName == 'iota' || 
        letterName == 'kappa' ||
        letterName == 'mu' ||
        letterName == 'nu' ||
        letterName == 'rho' ||
        letterName == 'tau' ||
        letterName == 'chi'

        )
        continue;
      assertSemanticText(upperCaseCmd, upperCaseSymbols[i]);
      assertSemanticText(lowerCaseSymbols[i], lowerCaseSymbols[i]);
      assertSemanticText(upperCaseSymbols[i], upperCaseSymbols[i]);
    }
  });

  test('new tests', function() {
  });

});
