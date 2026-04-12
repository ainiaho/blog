(function() {
    var searchIndex = window.SEARCH_INDEX_DATA || [];
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var hint = document.getElementById('search-hint');
    var clearBtn = document.getElementById('search-clear');
    var debounceTimer;

    if (!input) return;

    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        var query = this.value.trim();
        clearBtn.style.display = query ? 'block' : 'none';
        debounceTimer = setTimeout(function() {
            search(query);
        }, 200);
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        this.style.display = 'none';
        results.innerHTML = '';
        hint.style.display = 'block';
        input.focus();
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            clearBtn.click();
            input.blur();
        }
    });

    function search(query) {
        if (!query) {
            results.innerHTML = '';
            hint.style.display = 'block';
            return;
        }

        hint.style.display = 'none';
        var lowerQuery = query.toLowerCase();
        var results_ = [];

        for (var i = 0; i < searchIndex.length; i++) {
            var post = searchIndex[i];
            var titleLower = post.title.toLowerCase();
            var contentLower = post.content.toLowerCase();
            var tagsLower = post.tags.join(' ').toLowerCase();

            var score = 0;
            if (titleLower.indexOf(lowerQuery) !== -1) {
                score += 10;
                if (titleLower === lowerQuery) score += 20;
                if (titleLower.indexOf(lowerQuery) === 0) score += 5;
            }
            if (tagsLower.indexOf(lowerQuery) !== -1) {
                score += 5;
            }
            if (contentLower.indexOf(lowerQuery) !== -1) {
                score += 2;
            }

            if (score > 0) {
                results_.push({ post: post, score: score });
            }
        }

        results_.sort(function(a, b) { return b.score - a.score; });

        if (results_.length === 0) {
            results.innerHTML = '<div class="search-no-results">未找到相关文章</div>';
            return;
        }

        var html = '<div class="search-results-list">';
        html += '<div class="search-results-count">找到 ' + results_.length + ' 篇文章</div>';

        for (var j = 0; j < results_.length; j++) {
            var item = results_[j].post;
            html += '<a href="/posts/' + item.slug + '.html" class="search-result-item">';
            html += '<div class="search-result-title">' + highlightText(item.title, query) + '</div>';
            html += '<div class="search-result-meta">' + item.date;
            if (item.tags.length > 0) {
                html += ' · ' + item.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join(' ');
            }
            html += '</div>';
            html += '<div class="search-result-excerpt">' + highlightText(item.excerpt, query) + '</div>';
            html += '</a>';
        }

        html += '</div>';
        results.innerHTML = html;
    }

    function highlightText(text, query) {
        if (!query) return text;
        var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('(' + escaped + ')', 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
})();
