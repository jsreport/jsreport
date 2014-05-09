function mostSelling(books, prop) {
    return _.max(books, function(book){ return book.sales; })[prop];
}
