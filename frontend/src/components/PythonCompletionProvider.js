/* eslint-disable no-template-curly-in-string */
/**
 * Python IntelliSense / Autocomplete Completion Provider for Monaco Editor
 * 
 * Provides local, in-browser code suggestions for:
 * 1. Approved standard library modules (math, collections, statistics, json, etc.)
 * 2. Standard Python built-in functions & types
 * 3. Module member dot-completions (e.g. math.sqrt, statistics.mean, json.dumps)
 * 4. Useful Python structural code snippets (def, for, if, while, try)
 * 
 * SECURITY COMPLIANCE:
 * - Operating system / risk modules (os, sys, subprocess, socket, etc.) are strictly excluded.
 * - Entirely local computation (0 backend or network requests).
 */

let registeredProvider = null;

const APPROVED_MODULES = [
  { name: "math", documentation: "Mathematical functions (sqrt, floor, ceil, pi, e, etc.)" },
  { name: "string", documentation: "Common string operations and constants (ascii_letters, digits, etc.)" },
  { name: "random", documentation: "Generate pseudo-random numbers (randint, choice, shuffle, etc.)" },
  { name: "datetime", documentation: "Basic date and time types (datetime, date, time, timedelta)" },
  { name: "collections", documentation: "Container datatypes (Counter, defaultdict, deque, namedtuple)" },
  { name: "itertools", documentation: "Functions creating iterators for efficient looping (permutations, combinations, etc.)" },
  { name: "functools", documentation: "Higher-order functions and operations on callable objects (reduce, lru_cache, etc.)" },
  { name: "statistics", documentation: "Mathematical statistics functions (mean, median, mode, stdev, etc.)" },
  { name: "re", documentation: "Regular expression matching operations (search, match, findall, sub, etc.)" },
  { name: "json", documentation: "JSON encoder and decoder (dump, dumps, load, loads)" },
  { name: "decimal", documentation: "Decimal fixed point and floating point arithmetic" },
  { name: "fractions", documentation: "Rational numbers support" },
  { name: "heapq", documentation: "Heap queue algorithm (heappush, heappop, heapify, etc.)" },
  { name: "bisect", documentation: "Array bisection algorithm for binary search (bisect_left, insort, etc.)" },
  { name: "array", documentation: "Efficient arrays of basic values" },
  { name: "operator", documentation: "Standard operators as functions (itemgetter, attrgetter, etc.)" },
  { name: "copy", documentation: "Shallow and deep copy operations" },
  { name: "time", documentation: "Time access and conversions" },
  { name: "calendar", documentation: "General calendar-related functions" },
  { name: "dataclasses", documentation: "Data classes decorator and helper functions" },
  { name: "typing", documentation: "Support for type hints (List, Dict, Tuple, Optional, etc.)" },
  { name: "enum", documentation: "Support for enumerations" },
  { name: "numbers", documentation: "Numeric abstract base classes" },
  { name: "hashlib", documentation: "Secure hashes and message digests" },
  { name: "base64", documentation: "Base16, Base32, Base64 data encodings" },
];

const BUILTINS = [
  { label: "print", detail: "print(value, ...)", documentation: "Print objects to the console.", insertText: "print(${1:value})", isSnippet: true },
  { label: "len", detail: "len(s)", documentation: "Return the number of items in a container or sequence.", insertText: "len(${1:sequence})", isSnippet: true },
  { label: "range", detail: "range(stop)", documentation: "Return an immutable sequence of numbers from start to stop by step.", insertText: "range(${1:stop})", isSnippet: true },
  { label: "enumerate", detail: "enumerate(iterable)", documentation: "Return an enumerate object containing pairs of (index, item).", insertText: "enumerate(${1:iterable})", isSnippet: true },
  { label: "zip", detail: "zip(*iterables)", documentation: "Iterate over several iterables in parallel, yielding tuples with an item from each.", insertText: "zip(${1:iterables})", isSnippet: true },
  { label: "map", detail: "map(func, *iterables)", documentation: "Return an iterator that applies function to every item of iterable.", insertText: "map(${1:func}, ${2:iterable})", isSnippet: true },
  { label: "filter", detail: "filter(function, iterable)", documentation: "Construct an iterator from elements of iterable for which function returns true.", insertText: "filter(${1:function}, ${2:iterable})", isSnippet: true },
  { label: "sorted", detail: "sorted(iterable, key=None, reverse=False)", documentation: "Return a new sorted list from the items in iterable.", insertText: "sorted(${1:iterable})", isSnippet: true },
  { label: "sum", detail: "sum(iterable, start=0)", documentation: "Sums start and the items of an iterable from left to right.", insertText: "sum(${1:iterable})", isSnippet: true },
  { label: "min", detail: "min(iterable, *[, key, default])", documentation: "Return the smallest item in an iterable or the smallest of two or more arguments.", insertText: "min(${1:iterable})", isSnippet: true },
  { label: "max", detail: "max(iterable, *[, key, default])", documentation: "Return the largest item in an iterable or the largest of two or more arguments.", insertText: "max(${1:iterable})", isSnippet: true },
  { label: "abs", detail: "abs(x)", documentation: "Return the absolute value of a number.", insertText: "abs(${1:x})", isSnippet: true },
  { label: "round", detail: "round(number, ndigits=None)", documentation: "Round a number to a given precision in decimal digits.", insertText: "round(${1:number}, ${2:ndigits})", isSnippet: true },
  { label: "any", detail: "any(iterable)", documentation: "Return True if any element of the iterable is true.", insertText: "any(${1:iterable})", isSnippet: true },
  { label: "all", detail: "all(iterable)", documentation: "Return True if all elements of the iterable are true.", insertText: "all(${1:iterable})", isSnippet: true },
  { label: "type", detail: "type(object)", documentation: "Return the type of an object.", insertText: "type(${1:object})", isSnippet: true },
  { label: "isinstance", detail: "isinstance(object, classinfo)", documentation: "Return True if the object argument is an instance of the classinfo argument.", insertText: "isinstance(${1:object}, ${2:classinfo})", isSnippet: true },
  { label: "list", detail: "list([iterable])", documentation: "Built-in mutable sequence type.", insertText: "list(${1:iterable})", isSnippet: true },
  { label: "dict", detail: "dict(**kwargs)", documentation: "Built-in key-value mapping container type.", insertText: "dict()", isSnippet: false },
  { label: "set", detail: "set([iterable])", documentation: "Built-in unordered collection of unique elements.", insertText: "set(${1:iterable})", isSnippet: true },
  { label: "tuple", detail: "tuple([iterable])", documentation: "Built-in immutable sequence type.", insertText: "tuple(${1:iterable})", isSnippet: true },
  { label: "str", detail: "str(object='')", documentation: "Built-in string text sequence type.", insertText: "str(${1:object})", isSnippet: true },
  { label: "int", detail: "int(x=0)", documentation: "Built-in integer number type.", insertText: "int(${1:x})", isSnippet: true },
  { label: "float", detail: "float(x=0.0)", documentation: "Built-in floating point number type.", insertText: "float(${1:x})", isSnippet: true },
  { label: "bool", detail: "bool(x=False)", documentation: "Built-in Boolean truth value type.", insertText: "bool(${1:x})", isSnippet: true },
];

const MODULE_MEMBERS = {
  math: [
    { label: "sqrt", detail: "math.sqrt(x)", documentation: "Return the square root of x." },
    { label: "ceil", detail: "math.ceil(x)", documentation: "Return the ceiling of x as an Integral." },
    { label: "floor", detail: "math.floor(x)", documentation: "Return the floor of x as an Integral." },
    { label: "comb", detail: "math.comb(n, k)", documentation: "Number of ways to choose k items from n items without repetition and without order." },
    { label: "cos", detail: "math.cos(x)", documentation: "Return the cosine of x (measured in radians)." },
    { label: "sin", detail: "math.sin(x)", documentation: "Return the sine of x (measured in radians)." },
    { label: "tan", detail: "math.tan(x)", documentation: "Return the tangent of x (measured in radians)." },
    { label: "degrees", detail: "math.degrees(x)", documentation: "Convert angle x from radians to degrees." },
    { label: "radians", detail: "math.radians(x)", documentation: "Convert angle x from degrees to radians." },
    { label: "exp", detail: "math.exp(x)", documentation: "Return e raised to the power of x." },
    { label: "log", detail: "math.log(x, [base])", documentation: "Return the logarithm of x to the given base." },
    { label: "log2", detail: "math.log2(x)", documentation: "Return the base-2 logarithm of x." },
    { label: "log10", detail: "math.log10(x)", documentation: "Return the base-10 logarithm of x." },
    { label: "factorial", detail: "math.factorial(n)", documentation: "Find n! (n factorial)." },
    { label: "gcd", detail: "math.gcd(*integers)", documentation: "Greatest Common Divisor of arguments." },
    { label: "lcm", detail: "math.lcm(*integers)", documentation: "Least Common Multiple of arguments." },
    { label: "pow", detail: "math.pow(x, y)", documentation: "Return x raised to the power y." },
    { label: "pi", detail: "math.pi = 3.141592653589793", documentation: "The mathematical constant pi.", isField: true },
    { label: "e", detail: "math.e = 2.718281828459045", documentation: "The mathematical constant e.", isField: true },
  ],

  statistics: [
    { label: "mean", detail: "statistics.mean(data)", documentation: "Calculate the arithmetic mean of data." },
    { label: "median", detail: "statistics.median(data)", documentation: "Calculate the median (middle value) of numeric data." },
    { label: "mode", detail: "statistics.mode(data)", documentation: "Calculate the single most common data point." },
    { label: "stdev", detail: "statistics.stdev(data)", documentation: "Calculate the sample standard deviation." },
    { label: "variance", detail: "statistics.variance(data)", documentation: "Calculate the sample variance of data." },
    { label: "harmonic_mean", detail: "statistics.harmonic_mean(data)", documentation: "Calculate the harmonic mean of data." },
    { label: "geometric_mean", detail: "statistics.geometric_mean(data)", documentation: "Calculate the geometric mean of data." },
  ],

  json: [
    { label: "dumps", detail: "json.dumps(obj)", documentation: "Serialize obj to a JSON formatted str." },
    { label: "dump", detail: "json.dump(obj, fp)", documentation: "Serialize obj as a JSON formatted stream to fp." },
    { label: "loads", detail: "json.loads(s)", documentation: "Deserialize s (a str, bytes or bytearray instance containing a JSON document) to a Python object." },
    { label: "load", detail: "json.load(fp)", documentation: "Deserialize fp (a .read()-supporting text file or binary file) to a Python object." },
  ],

  random: [
    { label: "randint", detail: "random.randint(a, b)", documentation: "Return a random integer N such that a <= N <= b." },
    { label: "choice", detail: "random.choice(seq)", documentation: "Return a random element from the non-empty sequence seq." },
    { label: "choices", detail: "random.choices(population, weights=None, k=1)", documentation: "Return a k sized list of elements chosen from the population with replacement." },
    { label: "shuffle", detail: "random.shuffle(x)", documentation: "Shuffle sequence x in place." },
    { label: "random", detail: "random.random()", documentation: "Return the next random floating point number in the range [0.0, 1.0)." },
    { label: "sample", detail: "random.sample(population, k)", documentation: "Return a k length list of unique elements chosen from the population sequence." },
    { label: "uniform", detail: "random.uniform(a, b)", documentation: "Get a random number N such that a <= N <= b for a <= b and b <= N <= a for b < a." },
  ],

  collections: [
    { label: "Counter", detail: "collections.Counter([iterable-or-mapping])", documentation: "Dict subclass for counting hashable items." },
    { label: "defaultdict", detail: "collections.defaultdict(default_factory)", documentation: "Dict subclass that calls a factory function to supply missing values." },
    { label: "deque", detail: "collections.deque([iterable[, maxlen]])", documentation: "List-like container with fast appends and pops on either side." },
    { label: "namedtuple", detail: "collections.namedtuple(typename, field_names)", documentation: "Returns a new subclass of tuple with named fields." },
    { label: "OrderedDict", detail: "collections.OrderedDict()", documentation: "Dict subclass that remembers insertion order." },
  ],

  datetime: [
    { label: "datetime", detail: "datetime.datetime(year, month, day, ...)", documentation: "Combination of a date and a time." },
    { label: "date", detail: "datetime.date(year, month, day)", documentation: "An idealized naive date." },
    { label: "time", detail: "datetime.time(hour, minute, second)", documentation: "An idealized time, independent of any particular day." },
    { label: "timedelta", detail: "datetime.timedelta(days=0, seconds=0, ...)", documentation: "A duration expressing the difference between two date, time, or datetime instances." },
  ],

  re: [
    { label: "search", detail: "re.search(pattern, string)", documentation: "Scan through string looking for a location where the regular expression pattern produces a match." },
    { label: "match", detail: "re.match(pattern, string)", documentation: "If zero or more characters at the beginning of string match the regular expression pattern, return a corresponding match." },
    { label: "findall", detail: "re.findall(pattern, string)", documentation: "Return all non-overlapping matches of pattern in string, as a list of strings or tuples." },
    { label: "sub", detail: "re.sub(pattern, repl, string)", documentation: "Return the string obtained by replacing the leftmost non-overlapping occurrences of pattern in string by the replacement repl." },
    { label: "split", detail: "re.split(pattern, string)", documentation: "Split string by the occurrences of pattern." },
    { label: "compile", detail: "re.compile(pattern)", documentation: "Compile a regular expression pattern into a regular expression object." },
  ],

  string: [
    { label: "ascii_letters", detail: "string.ascii_letters", documentation: "The concatenation of ascii_lowercase and ascii_uppercase.", isField: true },
    { label: "digits", detail: "string.digits = '0123456789'", documentation: "The string '0123456789'.", isField: true },
    { label: "punctuation", detail: "string.punctuation", documentation: "String of ASCII characters which are considered punctuation characters in the C locale.", isField: true },
    { label: "whitespace", detail: "string.whitespace", documentation: "A string containing all ASCII characters that are considered whitespace.", isField: true },
  ],

  itertools: [
    { label: "permutations", detail: "itertools.permutations(iterable, r=None)", documentation: "Return successive r-length permutations of elements in the iterable." },
    { label: "combinations", detail: "itertools.combinations(iterable, r)", documentation: "Return r length subsequences of elements from the input iterable." },
    { label: "product", detail: "itertools.product(*iterables, repeat=1)", documentation: "Cartesian product of input iterables." },
    { label: "chain", detail: "itertools.chain(*iterables)", documentation: "Make an iterator that returns elements from the first iterable until it is exhausted, then proceeds to the next." },
    { label: "cycle", detail: "itertools.cycle(iterable)", documentation: "Make an iterator returning elements from the iterable and saving a copy of each." },
    { label: "repeat", detail: "itertools.repeat(object[, times])", documentation: "Make an iterator that returns object over and over again." },
    { label: "groupby", detail: "itertools.groupby(iterable, key=None)", documentation: "Make an iterator that returns consecutive keys and groups from the iterable." },
  ],

  functools: [
    { label: "reduce", detail: "functools.reduce(function, iterable[, initializer])", documentation: "Apply function of two arguments cumulatively to the items of sequence." },
    { label: "lru_cache", detail: "functools.lru_cache(maxsize=128, typed=False)", documentation: "Decorator to wrap a function with a memoizing callable that saves up to maxsize results." },
    { label: "partial", detail: "functools.partial(func, *args, **keywords)", documentation: "Return a new partial object which when called will behave like func called with the positional arguments args." },
  ],

  heapq: [
    { label: "heappush", detail: "heapq.heappush(heap, item)", documentation: "Push the value item onto the heap, maintaining the heap invariant." },
    { label: "heappop", detail: "heapq.heappop(heap)", documentation: "Pop and return the smallest item from the heap, maintaining the heap invariant." },
    { label: "heapify", detail: "heapq.heapify(x)", documentation: "Transform list x into a heap, in-place, in linear time." },
    { label: "nlargest", detail: "heapq.nlargest(n, iterable)", documentation: "Return a list with the n largest elements from the dataset." },
    { label: "nsmallest", detail: "heapq.nsmallest(n, iterable)", documentation: "Return a list with the n smallest elements from the dataset." },
  ],

  bisect: [
    { label: "bisect", detail: "bisect.bisect(a, x)", documentation: "Alias for bisect_right." },
    { label: "bisect_left", detail: "bisect.bisect_left(a, x)", documentation: "Locate the insertion point for x in a to maintain sorted order." },
    { label: "bisect_right", detail: "bisect.bisect_right(a, x)", documentation: "Locate insertion point for x in a, coming after any existing entries of x." },
    { label: "insort", detail: "bisect.insort(a, x)", documentation: "Insert x in a in sorted order." },
  ],
};

const SNIPPETS = [
  {
    label: "def",
    detail: "Function definition",
    documentation: "Define a Python function with parameters.",
    insertText: "def ${1:function_name}(${2:parameters}):\n    ${3:pass}",
  },
  {
    label: "for",
    detail: "For loop",
    documentation: "Iterate over elements in an iterable.",
    insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}",
  },
  {
    label: "if",
    detail: "If statement",
    documentation: "Conditional branch execution.",
    insertText: "if ${1:condition}:\n    ${2:pass}",
  },
  {
    label: "while",
    detail: "While loop",
    documentation: "Loop while condition evaluates to true.",
    insertText: "while ${1:condition}:\n    ${2:pass}",
  },
  {
    label: "try",
    detail: "Try / Except block",
    documentation: "Catch and handle exceptions gracefully.",
    insertText: "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}",
  },
];

/**
 * Registers the Python completion provider with Monaco editor instance.
 * Ensures single disposable registration.
 */
export const registerPythonCompletionProvider = (monaco) => {
  if (registeredProvider) {
    return registeredProvider;
  }

  registeredProvider = monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", " "],
    provideCompletionItems: (model, position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const lineUntilPosition = lineText.substring(0, position.column - 1);
      const word = model.getWordUntilPosition(position);

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // 1. Dot Completion (e.g., math., statistics., json., random., collections., etc.)
      const dotMatch = lineUntilPosition.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.\s*$/);
      if (dotMatch) {
        const moduleName = dotMatch[1];
        const members = MODULE_MEMBERS[moduleName];

        if (members) {
          return {
            suggestions: members.map((m) => ({
              label: m.label,
              kind: m.isField
                ? monaco.languages.CompletionItemKind.Field
                : monaco.languages.CompletionItemKind.Method,
              detail: m.detail || `${moduleName}.${m.label}`,
              documentation: m.documentation,
              insertText: m.label,
              range: range,
            })),
          };
        }
        return { suggestions: [] };
      }

      // 2. Import statement suggestions: "import " or "from "
      const importMatch = lineUntilPosition.match(/^\s*(import|from)\s+([a-zA-Z0-9_]*)$/);
      if (importMatch) {
        return {
          suggestions: APPROVED_MODULES.map((mod) => ({
            label: mod.name,
            kind: monaco.languages.CompletionItemKind.Module,
            detail: "Standard Library Module",
            documentation: mod.documentation,
            insertText: mod.name,
            range: range,
          })),
        };
      }

      // 3. Default suggestions: Built-ins + Approved Modules + Snippets
      const suggestions = [
        // Built-ins
        ...BUILTINS.map((b) => ({
          label: b.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: b.detail,
          documentation: b.documentation,
          insertText: b.insertText || b.label,
          insertTextRules: b.isSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range: range,
        })),

        // Approved Modules
        ...APPROVED_MODULES.map((m) => ({
          label: m.name,
          kind: monaco.languages.CompletionItemKind.Module,
          detail: "Standard Library Module",
          documentation: m.documentation,
          insertText: m.name,
          range: range,
        })),

        // Code Snippets
        ...SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: s.detail,
          documentation: s.documentation,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        })),
      ];

      return { suggestions: suggestions };
    },
  });

  return registeredProvider;
};
