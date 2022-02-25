function loadPlugin(pluginName) {
    if (!(pluginName in CONFIG.plugins)) return;
    let script = document.createElement('script');
    script.src = CONFIG.plugins[pluginName];
    document.body.appendChild(script);
}

function render() {
    document.querySelector('[name="url"]').value = document.location;
    document.getElementById('content').innerHTML = "";

    if (location.hash.length <= 1) {
        // Home: List all CTFs
        document.getElementById("add-ctf").style.display = 'block';
        document.getElementById("report-ctf").style.display = 'none';
        document.getElementById("ctf-note-title").textContent = "Index of write-ups/";

        const tiles = document.createElement('div');
        tiles.className = 'tile is-vertical';
        fetch("/api/list")
            .then(r => r.json())
            .then(({ ctf }) => {
                ctf.forEach(({ title, uuid }) => {
                    const titleText = document.createElement("p");
                    titleText.className = "title is-4";
                    titleText.textContent = title;

                    const uuidText = document.createElement("span");
                    uuidText.className = 'tag is-info';
                    uuidText.textContent = uuid;

                    const anchor = document.createElement("a");
                    anchor.className = 'notification';
                    anchor.href = `/#${uuid}`;
                    anchor.append(titleText, uuidText);
                    tiles.appendChild(anchor);
                });
            });
        document.getElementById("content").appendChild(tiles);
    } else {
        // write-up for a single CTF
        document.getElementById("add-ctf").style.display = 'none';
        document.getElementById("report-ctf").style.display = 'block';
        const ctfId = location.hash.slice(1); // uuid
        const WriteUps = {
            Web: {},
            Reverse: {},
            Pwn: {},
            Crypto: {},
            Misc: {}
        };

        fetch(`/api/${ctfId}`)
            .then(resp => resp.json())
            .then(ctf => {
                // title: the name of the game
                document.getElementById("ctf-note-title").textContent = ctf.contestName;
                ctf.writeups.forEach(writeup => {
                    if (!(writeup.category in WriteUps)) return;
                    WriteUps[writeup.category][writeup.challenge] = writeup.content;
                });

                const fragment = document.createDocumentFragment();
                Object.keys(WriteUps).forEach(category => {
                    // Title of the topic category (Web, Pwn etc.)
                    const categoryTitle = document.createElement("p");
                    categoryTitle.className = "title";
                    categoryTitle.textContent = category;
                    fragment.appendChild(categoryTitle);

                    // Display write-up by category
                    Object.keys(WriteUps[category]).forEach(challenge => {
                        // title name
                        const challengeTitle = document.createElement("p");
                        challengeTitle.className = "title is-4";
                        challengeTitle.textContent = challenge;
                        fragment.appendChild(challengeTitle);

                        // topic write-up
                        const challengeContent = document.createElement("div");
                        challengeContent.className = "box"
                        challengeContent.innerHTML = markdown.toHTML(WriteUps[category][challenge]);
                        fragment.appendChild(challengeContent);
                    });
                });
                document.getElementById("content").appendChild(fragment);
                return fetch("/api/enabled_plugins")
            })
            .then(r => r.json())
            .then(plugins => plugins.forEach(loadPlugin));
    };
}


// The following things should have nothing to do with solving the problem, it's really tiring to carve the UI

document.addEventListener('DOMContentLoaded', render, false);
window.addEventListener("hashchange", render, false);

document.getElementById("add-challenge").addEventListener("click", function () {
    const template = document.getElementById("challenge-template");
    const challenge = document.importNode(template.content, true);
    challenge.querySelector(".delete-challenge").onclick = event => event.target.closest(".challenge").remove();
    document.getElementById("challenge-container").appendChild(challenge);
});

document.getElementById("add-ctf").addEventListener("click", function () {
    document.querySelector(".modal").classList.add('is-active');
});

document.querySelector(".modal-close").addEventListener("click", function () {
    document.querySelector(".modal").classList.remove('is-active');
});

document.querySelector(".modal #submit").addEventListener("click", function () {
    const contestName = document.querySelector('.modal [name=contestName]').value;
    const writeups = [...document.querySelectorAll('.modal .challenge')].map(elem => Object.fromEntries(new FormData(elem)));
    fetch("/api/add", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contestName, writeups })
    })
        .then(r => r.json())
        .then(({ uuid }) => {
            document.querySelector(".modal").classList.remove('is-active');
            location = `/#${uuid}`;
        });
});
